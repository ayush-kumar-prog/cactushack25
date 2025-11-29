import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const DEBUG_PREFIX = '[DEBUG:TTS]';

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

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_KEY;
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah" - clear, calm voice

console.log(`${DEBUG_PREFIX} TTS Service loaded`);
console.log(`${DEBUG_PREFIX} ElevenLabs API Key configured:`, !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here');

// Audio configuration for proper speaker output
async function configureAudio() {
  const start = logTiming('🔧 Configuring audio mode');
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false, // Force speaker, not earpiece
    });
    logTiming('🔧 Audio mode configured', start);
  } catch (e) {
    console.error(`${DEBUG_PREFIX} ❌ Audio configuration error:`, e);
  }
}

// Current playing sound reference for cleanup
let currentSound: Audio.Sound | null = null;

/**
 * Speak text using ElevenLabs API with fallback to system TTS
 */
export async function speak(text: string): Promise<void> {
  const totalStart = logTiming('🔊 speak() STARTED');
  console.log(`${DEBUG_PREFIX} 📝 Text: "${text.substring(0, 50)}..."`);
  console.log(`${DEBUG_PREFIX} 📊 Text length: ${text.length} chars`);

  // Stop any currently playing audio
  await stopSpeaking();

  // Configure audio for speaker output
  await configureAudio();

  // Try ElevenLabs first
  if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here') {
    console.log(`${DEBUG_PREFIX} 🎵 Using ElevenLabs TTS...`);
    try {
      const fetchStart = logTiming('🌐 ElevenLabs API call started');
      const audioUri = await fetchElevenLabsAudio(text);
      logTiming('🌐 ElevenLabs API call complete', fetchStart);

      const playStart = logTiming('▶️ Audio playback started');
      await playAudio(audioUri);
      logTiming('▶️ Audio playback complete', playStart);

      logTiming('✅ speak() COMPLETE (ElevenLabs)', totalStart);
      return;
    } catch (error) {
      console.warn(`${DEBUG_PREFIX} ⚠️ ElevenLabs TTS failed, falling back to system TTS:`, error);
    }
  } else {
    console.log(`${DEBUG_PREFIX} 📢 ElevenLabs not configured, using system TTS`);
  }

  // Fallback to expo-speech (system TTS)
  const systemStart = logTiming('📢 System TTS started');
  await speakWithSystem(text);
  logTiming('📢 System TTS complete', systemStart);
  logTiming('✅ speak() COMPLETE (system)', totalStart);
}

/**
 * Fetch audio from ElevenLabs API
 */
async function fetchElevenLabsAudio(text: string): Promise<string> {
  const start = logTiming('🌐 fetchElevenLabsAudio() started');

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5', // Ultra-low latency model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const convertStart = logTiming('🔄 Converting audio to base64');
  // Convert response to base64 data URI
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );
  logTiming('🔄 Audio converted to base64', convertStart);
  console.log(`${DEBUG_PREFIX} 📊 Audio size: ~${Math.round((base64.length * 3/4) / 1024)}KB`);

  logTiming('🌐 fetchElevenLabsAudio() complete', start);
  return `data:audio/mpeg;base64,${base64}`;
}

/**
 * Play audio from URI using expo-av
 */
async function playAudio(uri: string): Promise<void> {
  const start = logTiming('▶️ playAudio() started');

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, volume: 1.0 }
  );

  currentSound = sound;

  // Wait for playback to finish
  return new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        logTiming('▶️ playAudio() finished', start);
        sound.unloadAsync();
        currentSound = null;
        resolve();
      }
    });
  });
}

/**
 * Speak using system TTS (fallback)
 */
async function speakWithSystem(text: string): Promise<void> {
  const start = logTiming('📢 speakWithSystem() started');

  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9, // Slightly slower for clarity in emergency
      onDone: () => {
        logTiming('📢 speakWithSystem() finished', start);
        resolve();
      },
      onError: () => {
        console.error(`${DEBUG_PREFIX} ❌ System TTS error`);
        resolve();
      },
    });
  });
}

/**
 * Stop any currently playing speech
 */
export async function stopSpeaking(): Promise<void> {
  // Stop ElevenLabs audio
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {
      // Ignore errors during cleanup
    }
    currentSound = null;
  }

  // Stop system TTS
  Speech.stop();
}

/**
 * Check if currently speaking
 */
export async function isSpeakingAsync(): Promise<boolean> {
  if (currentSound !== null) return true;
  return await Speech.isSpeakingAsync();
}
