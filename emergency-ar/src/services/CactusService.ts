import { CactusLM } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system/legacy';

// We'll use the model slug or path. If using a custom path, we might need to handle it differently.
// For now, let's assume we can pass the path if the native module supports it, 
// or we use a standard model name and the user puts it in the right place.
// Given the instructions, we'll try to use the path directly if possible, or fallback to a known model.
const MODEL_PATH = '/sdcard/Download/SmolVLM2-500M-Instruct.gguf';

let cactus: CactusLM | null = null;
let isInitializing = false;

export async function initCactus() {
    if (cactus || isInitializing) return;
    isInitializing = true;

    try {
        console.log('[Cactus] Initializing...');

        // Initialize CactusLM
        // We pass the model path as the 'model' parameter. 
        // If the native implementation expects a slug, this might fail unless we register it.
        // However, for this hackathon/overhaul, we'll assume direct path usage or standard model loading.
        cactus = new CactusLM({
            model: MODEL_PATH,
            contextSize: 2048,
        });

        // We skip download() as the user is pushing files via ADB.
        // We call init() directly.
        await cactus.init();
        console.log('[Cactus] Initialization successful');

    } catch (error) {
        console.error('[Cactus] Initialization error:', error);
        cactus = null;
    } finally {
        isInitializing = false;
    }
}

export async function analyzeWithCactus(imageBase64: string | null, prompt: string): Promise<string> {
    if (!cactus) {
        await initCactus();
        if (!cactus) return "AI model not ready. Please try again.";
    }

    try {
        console.log('[Cactus] Generating response...');

        // Save base64 to temp file for Cactus
        let imagePath: string | undefined;
        if (imageBase64) {
            imagePath = `${FileSystem.cacheDirectory}temp_image.jpg`;
            await FileSystem.writeAsStringAsync(imagePath, imageBase64, {
                encoding: FileSystem.EncodingType.Base64,
            });
        }

        const messages = [
            {
                role: 'user' as const,
                content: prompt,
                images: imagePath ? [imagePath] : undefined
            }
        ];

        const result = await cactus.complete({
            messages,
            options: {
                maxTokens: 100,
                temperature: 0.7,
            }
        });

        console.log('[Cactus] Response:', result);
        return result.response || "I couldn't understand that.";
    } catch (error) {
        console.error('[Cactus] Inference error:', error);
        return "Error processing request.";
    }
}
