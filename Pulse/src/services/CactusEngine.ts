import { useIncidentContext } from '../store/IncidentContext';
import { audioService } from './AudioService';
import { locationService } from './LocationService';
import { medGemmaService } from './MedGemmaService';

class CactusEngine {
    async start() {
        console.log('[CactusEngine] Starting System...');
        const startTime = Date.now();

        // 1. Initialize Brain (MedGemma)
        await medGemmaService.loadModel();

        // 2. Initialize Senses (Parallel)
        console.log('[CactusEngine] Initializing Sensory System...');

        const [hasLocation, hasAudio] = await Promise.all([
            locationService.requestPermissions(),
            audioService.requestPermissions()
        ]);

        if (hasLocation) {
            const loc = await locationService.getCurrentLocation();
            if (loc) {
                useIncidentContext.getState().updateEnvironment({
                    gps: { lat: loc.coords.latitude, long: loc.coords.longitude }
                });
            }
        } else {
            console.warn('[CactusEngine] Location permission denied.');
        }

        if (hasAudio) {
            await audioService.startRecording();
        } else {
            console.warn('[CactusEngine] Audio permission denied.');
        }

        useIncidentContext.getState().setStatus('SCANNING');
        console.log(`[CactusEngine] System Ready in ${Date.now() - startTime}ms`);
    }

    async stop() {
        console.log('[CactusEngine] Stopping System...');
        await audioService.stopRecording();
        console.log('[CactusEngine] System Stopped.');
    }

    // Method called by Vision Component when it detects something
    async processFrame(data: any) {
        console.log('[CactusEngine] Vision Event Received');
        // Forward to MedGemma
        await medGemmaService.processInput({ type: 'image', data });
    }
}

export const cactusEngine = new CactusEngine();
