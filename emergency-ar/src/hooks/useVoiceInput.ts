import { useState, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';

const DEBUG_PREFIX = '[DEBUG:VOICE]';

// Timing helper
const getTimestamp = () => new Date().toISOString().substr(11, 12);
const logTiming = (label: string, startTime?: number) => {
  const now = Date.now();
  if (startTime) {
    console.log(`${DEBUG_PREFIX} ⏱️ ${label}: ${now - startTime}ms`);
  } else {
    console.log(`${DEBUG_PREFIX} ⏱️ ${label} @ ${getTimestamp()}`);
  }
  return now;
};

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  toggleListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasPermission = useRef(false);
  const listenStartTime = useRef<number>(0);
  const isListeningRef = useRef(false); // For toggle function

  console.log(`${DEBUG_PREFIX} Hook initialized with expo-speech-recognition`);
  console.log(`${DEBUG_PREFIX} ExpoSpeechRecognitionModule available:`, !!ExpoSpeechRecognitionModule);


  // Set up event listeners using the hook
  useSpeechRecognitionEvent('start', () => {
    logTiming('🎤 Speech recognition STARTED');
    setIsListening(true);
    isListeningRef.current = true;
  });

  useSpeechRecognitionEvent('end', () => {
    const duration = listenStartTime.current ? Date.now() - listenStartTime.current : 0;
    console.log(`${DEBUG_PREFIX} ⏱️ 🎤 Speech recognition ENDED (total listen time: ${duration}ms)`);
    setIsListening(false);
    isListeningRef.current = false;
  });

  useSpeechRecognitionEvent('result', (event) => {
    const resultTime = logTiming('📝 Speech RESULT received');
    console.log(`${DEBUG_PREFIX} 📝 Results:`, JSON.stringify(event.results));
    console.log(`${DEBUG_PREFIX} 📝 isFinal:`, event.isFinal);
    if (event.results && event.results.length > 0) {
      const result = event.results[0]?.transcript || '';
      console.log(`${DEBUG_PREFIX} 📝 Transcript: "${result}"`);
      setTranscript(result);

      // Reset silence timer on every new result
      resetSilenceTimer();

      if (listenStartTime.current) {
        console.log(`${DEBUG_PREFIX} ⏱️ Time from listen start to result: ${resultTime - listenStartTime.current}ms`);
      }
    }
  });

  // Silence timer ref
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    // Auto-stop after 1.5s of silence
    silenceTimerRef.current = setTimeout(() => {
      console.log(`${DEBUG_PREFIX} 🤫 Silence detected (1.5s), stopping listening...`);
      stopListening();
    }, 1500);
  }, []);

  useSpeechRecognitionEvent('error', (event) => {
    console.error(`${DEBUG_PREFIX} ❌ Speech ERROR:`, event.error, event.message);
    setError(event.message || event.error || 'Speech recognition error');
    setIsListening(false);
    isListeningRef.current = false;
  });

  const startListening = useCallback(async () => {
    const startTime = logTiming('🎯 startListening() called');
    listenStartTime.current = startTime;

    try {
      setError(null);
      setTranscript('');

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check and request permissions if needed
      if (!hasPermission.current) {
        const permStart = logTiming('🔐 Requesting permissions...');
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        logTiming('🔐 Permissions received', permStart);
        console.log(`${DEBUG_PREFIX} 🔐 Permission granted:`, result.granted);

        if (!result.granted) {
          console.error(`${DEBUG_PREFIX} ❌ Permissions not granted`);
          setError('Microphone permission not granted');
          return;
        }
        hasPermission.current = true;
      }

      // Check if recognition is available
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      console.log(`${DEBUG_PREFIX} 🔍 Recognition available:`, available);

      if (!available) {
        setError('Speech recognition not available on this device');
        return;
      }

      logTiming('🚀 Calling ExpoSpeechRecognitionModule.start()');
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true, // Enable continuous to handle VAD manually if needed

        // iOS will use on-device dictation which usually handles end-of-speech well
      });
      logTiming('🚀 ExpoSpeechRecognitionModule.start() returned', startTime);
    } catch (e: any) {
      console.error(`${DEBUG_PREFIX} ❌ Failed to start voice recognition:`, e);
      setError('Failed to start voice recognition');
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, []);

  const stopListening = useCallback(async () => {
    const stopTime = logTiming('🛑 stopListening() called');
    if (listenStartTime.current) {
      console.log(`${DEBUG_PREFIX} ⏱️ Listen duration before stop: ${stopTime - listenStartTime.current}ms`);
    }

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      ExpoSpeechRecognitionModule.stop();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      logTiming('🛑 ExpoSpeechRecognitionModule.stop() returned', stopTime);
    } catch (e: any) {
      console.error(`${DEBUG_PREFIX} ❌ Failed to stop voice recognition:`, e);
    }
  }, []);

  // Toggle function for click-to-talk
  const toggleListening = useCallback(async () => {
    console.log(`${DEBUG_PREFIX} 🔄 toggleListening() called, current state:`, isListeningRef.current);
    if (isListeningRef.current) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    console.log(`${DEBUG_PREFIX} 🔄 resetTranscript called`);
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
}
