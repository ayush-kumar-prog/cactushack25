import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

class AudioService {
    private recording: Audio.Recording | null = null;
    private isListening: boolean = false;
    private processingInterval: NodeJS.Timeout | null = null;

    async requestPermissions(): Promise<boolean> {
        const { status } = await Audio.requestPermissionsAsync();
        console.log(`[AudioService] Permission status: ${status}`);
        return status === 'granted';
    }

    async startListening(onAudioChunk: (uri: string) => void): Promise<void> {
        if (this.isListening) return;
        this.isListening = true;
        console.log('[AudioService] Starting continuous listening...');

        const recordChunk = async () => {
            if (!this.isListening) return;

            try {
                // 1. Start Recording
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                this.recording = recording;

                // 2. Wait for chunk duration (e.g. 5 seconds)
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 3. Stop and Process
                if (this.recording && this.isListening) {
                    await this.recording.stopAndUnloadAsync();
                    const uri = this.recording.getURI();
                    this.recording = null;

                    if (uri) {
                        console.log(`[AudioService] Chunk captured: ${uri}`);
                        onAudioChunk(uri);
                    }
                }

                // 4. Loop
                if (this.isListening) {
                    recordChunk();
                }
            } catch (err) {
                console.error('[AudioService] Error in listening loop:', err);
                // Retry after delay
                setTimeout(recordChunk, 1000);
            }
        };

        recordChunk();
    }

    async stopListening(): Promise<void> {
        this.isListening = false;
        console.log('[AudioService] Stopping listening...');
        if (this.recording) {
            try {
                await this.recording.stopAndUnloadAsync();
            } catch (e) {
                console.warn('[AudioService] Error stopping recording:', e);
            }
            this.recording = null;
        }
    }

    // Legacy methods kept for compatibility if needed, but startListening replaces startRecording
    async startRecording(): Promise<void> {
        // ... (can be deprecated or removed)
        this.startListening(() => { });
    }

    async stopRecording(): Promise<string | null> {
        await this.stopListening();
        return null;
    }

    async speak(text: string): Promise<void> {
        console.log(`[AudioService] Speaking: "${text}"`);
        Speech.speak(text, {
            language: 'en-GB', // British accent for that "Jarvis" feel?
            rate: 1.0,
            pitch: 1.0,
        });
    }
}

export const audioService = new AudioService();
