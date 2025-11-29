import { CactusLM, CactusLMCompleteParams, CactusLMCompleteResult } from 'cactus-react-native';
import { create } from 'zustand';

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
    private isLoaded: boolean = false;
    private model: CactusLM | null = null;

    async loadModel(): Promise<void> {
        console.log('[MedGemmaService] Initializing Cactus LM...');
        const store = useModelStore.getState();

        try {
            // Initialize CactusLM instance with MedGemma model
            this.model = new CactusLM({
                model: 'google/medgemma-4b-it'
            });
            console.log('[MedGemmaService] CactusLM instance created.');

            // Download MedGemma model
            console.log('[MedGemmaService] Downloading MedGemma-4b-it model...');
            store.setDownloading(true);

            await this.model.download({
                onProgress: (progress) => {
                    const percentage = Math.round(progress * 100);
                    console.log(`[MedGemmaService] Download progress: ${percentage}% `);
                    store.setProgress(percentage);
                }
            });

            store.setDownloading(false);
            this.isLoaded = true;
            console.log('[MedGemmaService] ✓ Model "MedGemma-4b-it" loaded successfully.');
        } catch (error) {
            store.setDownloading(false);
            console.error('[MedGemmaService] Failed to load model:', error);
            throw error;
        }
    }

    async processInput(input: { type: 'text' | 'image' | 'audio', data: any }): Promise<string> {
        if (!this.isLoaded || !this.model) {
            console.error('[MedGemmaService] Model not loaded. Call loadModel() first.');
            return "Error: Model not loaded";
        }

        console.log(`[MedGemmaService] Processing input type: ${input.type} `);

        try {
            // Prepare prompt based on input type
            let userMessage = '';

            if (input.type === 'text') {
                userMessage = input.data;
            } else if (input.type === 'image') {
                // For vision tasks, we'd need to encode the image
                // For now, use a text prompt describing the analysis task
                userMessage = "Analyze this medical scene. Describe any visible injuries or conditions.";
            } else if (input.type === 'audio') {
                // For audio transcription, we'd use Whisper
                userMessage = "Transcribe the following audio input.";
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
            const result: CactusLMCompleteResult = await this.model.complete(params);
            const inferenceTime = Date.now() - startTime;

            if (result.success) {
                console.log(`[MedGemmaService] ✓ Inference completed in ${inferenceTime} ms`);
                console.log(`[MedGemmaService] Tokens / sec: ${result.tokensPerSecond.toFixed(2)} `);
                console.log(`[MedGemmaService] Response: ${result.response.substring(0, 100)}...`);
                return result.response;
            } else {
                console.error('[MedGemmaService] Inference failed: success=false');
                return `Error: Inference failed`;
            }
        } catch (error) {
            console.error('[MedGemmaService] Inference failed:', error);
            return `Error: ${error} `;
        }
    }
}

export const medGemmaService = new MedGemmaService();
