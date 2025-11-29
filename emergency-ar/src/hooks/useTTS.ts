import { useState, useCallback } from 'react';
import { speak as speakTTS, stopSpeaking } from '../services/TTSService';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await speakTTS(text);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(async () => {
    await stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
