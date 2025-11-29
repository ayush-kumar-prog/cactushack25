import { Audio } from 'expo-av';

class AudioService {
    private recording: Audio.Recording | null = null;

    async requestPermissions(): Promise<boolean> {
        const { status } = await Audio.requestPermissionsAsync();
        console.log(`[AudioService] Permission status: ${status}`);
        return status === 'granted';
    }

    async startRecording(): Promise<void> {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            this.recording = recording;
            console.log('[AudioService] Recording started successfully');
        } catch (err) {
            console.error('[AudioService] Failed to start recording', err);
        }
    }

    async stopRecording(): Promise<string | null> {
        if (!this.recording) {
            console.warn('[AudioService] No active recording to stop');
            return null;
        }

        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        this.recording = null;
        console.log(`[AudioService] Recording stopped. File saved at: ${uri}`);
        return uri;
    }
}

export const audioService = new AudioService();
