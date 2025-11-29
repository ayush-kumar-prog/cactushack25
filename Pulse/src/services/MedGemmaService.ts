import { CactusLM, CactusLMCompleteParams, CactusLMCompleteResult } from 'cactus-react-native';
import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';

// Store for download progress
export const useModelStore = create<{
    isDownloading: boolean;
    progress: number;
    setProgress: (p: number) => void;
    setDownloading: (d: boolean) => void;
}>((set) => ({
    isDownloading: false,
    progress: 0,
    setProgress: (progress) => set({ progress }),
    setDownloading: (isDownloading) => set({ isDownloading }),
}));

class MedGemmaService {
    private static instance: MedGemmaService;
    private isLoaded: boolean = false;
    private textModel: CactusLM | null = null;
    private visionModel: CactusLM | null = null;

    private constructor() { }

    public static getInstance(): MedGemmaService {
        if (!MedGemmaService.instance) {
            MedGemmaService.instance = new MedGemmaService();
        }
        return MedGemmaService.instance;
    }

    async loadModel(): Promise<void> {
        if (this.isLoaded) {
            console.log('[MedGemmaService] Models already loaded, skipping...');
            return;
        }

        console.log('[MedGemmaService] Initializing Cactus LM...');
        const store = useModelStore.getState();

        if (store.isDownloading) {
            console.log('[MedGemmaService] Download already in progress, skipping...');
            return;
        }

        try {
            // 1. Check Network
            try {
                console.log('[MedGemmaService] Checking connectivity...');
                const response = await fetch('https://huggingface.co', { method: 'HEAD' });
                console.log(`[MedGemmaService] Network check: ${response.status}`);
            } catch (e) {
                console.error('[MedGemmaService] Network check failed:', e);
            }

            // 2. Setup Directory
            let corpusDir = undefined;
            if (FileSystem.documentDirectory) {
                corpusDir = FileSystem.documentDirectory.replace('file://', '') + 'cactus';
                console.log(`[MedGemmaService] Using corpusDir: ${corpusDir}`);
                await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'cactus', { intermediates: true }).catch(() => { });
            }

            // 3. Query available models first
            console.log('[MedGemmaService] Querying available models from Cactus...');
            const tempModel = new CactusLM();
            try {
                const availableModels = await tempModel.getModels();
                console.log('[MedGemmaService] Available models:', availableModels.length);

                // Find our target models
                const gemma3 = availableModels.find(m => m.slug === 'gemma3-1b');
                const visionModel = availableModels.find(m => m.slug === 'lfm2-vl-1.6b');

                console.log('[MedGemmaService] Target models:');
                console.log(`  - gemma3-1b: ${gemma3 ? 'Found' : 'NOT FOUND'} (${gemma3?.sizeMb}MB, Downloaded: ${gemma3?.isDownloaded})`);
                console.log(`  - lfm2-vl-1.6b: ${visionModel ? 'Found' : 'NOT FOUND'} (${visionModel?.sizeMb}MB, Downloaded: ${visionModel?.isDownloaded})`);
            } catch (e) {
                console.warn('[MedGemmaService] Could not fetch models list:', e);
            }
            await tempModel.destroy();

            // 4. Initialize Text Model (Gemma3-1B)
            console.log('[MedGemmaService] Creating Gemma3-1B text model...');
            this.textModel = new CactusLM({
                model: 'gemma3-1b',
                corpusDir: corpusDir
            });
            console.log('[MedGemmaService] ✓ Gemma3 text model instance created.');

            // 5. Initialize Vision Model (LFM2-VL-1.6B)
            console.log('[MedGemmaService] Creating LFM2-VL-1.6B vision model...');
            this.visionModel = new CactusLM({
                model: 'lfm2-vl-1.6b',
                corpusDir: corpusDir
            });
            console.log('[MedGemmaService] ✓ LFM2 vision model instance created.');

            // 6. Download Text Model
            console.log('[MedGemmaService] Downloading Gemma3-1B (642MB)...');
            console.log('[MedGemmaService] This may take several minutes depending on network speed.');
            store.setDownloading(true);

            try {
                await this.textModel.download({
                    onProgress: (progress) => {
                        const percentage = Math.round(progress * 100);
                        console.log(`[MedGemmaService] Gemma3 download: ${percentage}%`);
                        store.setProgress(percentage);
                    }
                });
                console.log('[MedGemmaService] ✓ Gemma3-1B download completed.');
            } catch (downloadError) {
                console.error('[MedGemmaService] Gemma3 download failed!');
                throw downloadError;
            }

            // 7. Download Vision Model
            console.log('[MedGemmaService] Downloading LFM2-VL-1.6B (1440MB)...');
            console.log('[MedGemmaService] This is a larger model, please be patient...');

            try {
                await this.visionModel.download({
                    onProgress: (progress) => {
                        const percentage = Math.round(progress * 100);
                        console.log(`[MedGemmaService] LFM2-VL download: ${percentage}%`);
                        store.setProgress(percentage);
                    }
                });
                console.log('[MedGemmaService] ✓ LFM2-VL-1.6B download completed.');
            } catch (downloadError) {
                console.error('[MedGemmaService] LFM2-VL download failed!');
                throw downloadError;
            }

            store.setDownloading(false);
            this.isLoaded = true;
            console.log('[MedGemmaService] ✓ Both models loaded successfully (Gemma3 + LFM2-VL).');
        } catch (error) {
            store.setDownloading(false);
            console.error('[MedGemmaService] Failed to load model:', error);
            throw error;
        }
    }

    private isGenerating: boolean = false;

    async processInput(input: { type: 'text' | 'image' | 'audio', data: any }): Promise<string> {
        if (!this.isLoaded || !this.textModel || !this.visionModel) {
            console.error('[MedGemmaService] Models not loaded. Call loadModel() first.');
            return "Error: Models not loaded";
        }

        if (this.isGenerating) {
            console.log('[MedGemmaService] Inference already in progress, skipping frame...');
            return "Error: Busy";
        }

        console.log(`[MedGemmaService] Processing input type: ${input.type}`);
        this.isGenerating = true;

        try {
            // Prepare prompt based on input type
            let userMessage = '';
            let targetModel: CactusLM;

            if (input.type === 'text') {
                userMessage = input.data;
                targetModel = this.textModel;
            } else if (input.type === 'image') {
                // Use vision model for image analysis
                userMessage = "Analyze this medical scene. Describe: 1) Is there a person visible? 2) What is their body position (standing/sitting/lying down)? 3) Are they moving? Be concise.";
                targetModel = this.visionModel;
            } else if (input.type === 'audio') {
                // For audio transcription, we'd use Whisper (CactusSTT)
                // MOCK TRANSCRIPTION FOR NOW
                // In a real scenario, we'd send input.data (uri) to a STT model
                userMessage = "I found a person on the ground."; // Placeholder

                // Add to transcript
                const { addItem } = require('../store/TranscriptStore').useTranscriptStore.getState();
                addItem('user', userMessage);

                targetModel = this.textModel;
            } else {
                targetModel = this.textModel;
            }

            console.log(`[MedGemmaService] Running inference with prompt: "${userMessage.substring(0, 50)}..."`);

            // Prepare the complete params
            const params: CactusLMCompleteParams = {
                messages: [
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                options: {
                    temperature: 0.7,
                    maxTokens: 512
                }
            };

            // Run inference
            const startTime = Date.now();
            const result: CactusLMCompleteResult = await targetModel.complete(params);
            const inferenceTime = Date.now() - startTime;

            if (result.success) {
                console.log(`[MedGemmaService] ✓ Inference completed in ${inferenceTime} ms`);

                // If this was a conversation (text/audio), speak the response
                if (input.type === 'audio' || input.type === 'text') {
                    const { addItem } = require('../store/TranscriptStore').useTranscriptStore.getState();
                    addItem('ai', result.response);

                    const { audioService } = require('./AudioService');
                    audioService.speak(result.response);
                }

                return result.response;
            } else {
                console.error('[MedGemmaService] Inference failed: success=false');
                return `Error: Inference failed`;
            }
        } catch (error) {
            console.error('[MedGemmaService] Inference failed:', error);
            return `Error: ${error} `;
        } finally {
            this.isGenerating = false;
        }
    }
}

export const medGemmaService = MedGemmaService.getInstance();
