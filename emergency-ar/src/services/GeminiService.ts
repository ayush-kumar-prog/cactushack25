import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '../types';

const DEBUG_PREFIX = '[DEBUG:GEMINI]';

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

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;

console.log(`${DEBUG_PREFIX} Gemini Service loaded`);
console.log(`${DEBUG_PREFIX} API Key configured:`, !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here');
console.log(`${DEBUG_PREFIX} API Key (first 10 chars):`, GEMINI_API_KEY?.substring(0, 10) + '...');

// Initialize Gemini with optimized settings
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI?.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    maxOutputTokens: 100, // Limit output for faster response
    temperature: 0.7,
  },
});

console.log(`${DEBUG_PREFIX} genAI initialized:`, !!genAI);
console.log(`${DEBUG_PREFIX} model initialized:`, !!model);

// System prompt for emergency medical guidance
const SYSTEM_PROMPT = `You are an intelligent emergency medical assistant. Your goal is to guide a bystander to help a person in distress.

CORE PERSONALITY:
1. Be CALM, REASSURING, and DIRECT.
2. Speak naturally, like a helpful paramedic on a video call.
3. Do NOT sound like a robot reading a checklist.
4. Acknowledge the user's emotions if they seem panicked (e.g., "I know this is scary, but you're doing great. Let's help them.").

OPERATIONAL RULES:
1. **Dynamic Assessment**: Do NOT force a rigid order if the user provides info.
   - If user says "He's not breathing", JUMP IMMEDIATELY to Pulse Check/CPR.
   - If user says "I found him on the floor", ask about responsiveness.
2. **Conciseness**: Keep responses SHORT (under 25 words). In emergencies, people can't read/listen to paragraphs.
3. **One Step at a Time**: Give only ONE major instruction at a time so the user isn't overwhelmed.

MEDICAL PROTOCOL (ABCDE) - Use as a mental guide, not a script:
1. Danger/Response: Is it safe? Are they responsive?
2. Airway: Is it clear?
3. Breathing: Look, listen, feel (10s).
4. Circulation: Pulse check (10s).
5. CPR: If no pulse/breathing -> 30 compressions : 2 breaths.

MARKER INSTRUCTIONS:
Include a [MARKER:location] tag ONLY when you need to highlight a specific body part for the CURRENT instruction:
- [MARKER:neck] - for pulse check
- [MARKER:chest] - for breathing check or CPR
- [MARKER:head] - for airway/head tilt

Example Interactions:
User: "I found a guy collapsed."
AI: "Okay, I'm here with you. First, is he responsive? Shake his shoulders and shout hello."

User: "He's not waking up!"
AI: "Understood. Check for breathing. Watch his chest for movement for 10 seconds. [MARKER:chest]"

User: "He's not breathing at all!"
AI: "Check for a pulse at the side of the neck. Use two fingers. [MARKER:neck]"

User: "No pulse!"
AI: "Start CPR immediately. Push hard and fast in the center of the chest. [MARKER:chest]"`;

interface GeminiResponse {
  response: string;
  marker?: string;
}

/**
 * Analyze the scene and respond to user input
 */
export async function analyzeAndRespond(
  imageBase64: string | null,
  conversation: Message[]
): Promise<GeminiResponse> {
  const totalStart = logTiming('🤖 analyzeAndRespond() STARTED');

  if (!model) {
    throw new Error('Gemini API not initialized. Check your API key.');
  }

  // Build conversation history
  const buildStart = logTiming('📝 Building prompt');
  const historyText = conversation
    .map((m) => `${m.role}: ${m.text}`)
    .join('\n');

  console.log(`${DEBUG_PREFIX} 📝 Sending conversation history to Gemini:\n${historyText}`);

  const prompt = `${SYSTEM_PROMPT}

Current conversation:
${historyText || 'No conversation yet - this is the start.'}

${imageBase64 ? 'I can see the patient in the image.' : ''}

Provide your next instruction to help the user. Remember to include a [MARKER:location] tag if you need to show them where to look or act.`;

  logTiming('📝 Prompt built', buildStart);
  console.log(`${DEBUG_PREFIX} 📊 Prompt length: ${prompt.length} chars`);
  console.log(`${DEBUG_PREFIX} 📊 Conversation messages: ${conversation.length}`);

  try {
    let result;

    if (imageBase64) {
      // Include image in the request
      const apiStart = logTiming('🌐 API call with IMAGE started');
      console.log(`${DEBUG_PREFIX} 📷 Including image in request`);

      result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
      ]);

      logTiming('🌐 API call with IMAGE complete', apiStart);
    } else {
      // Text-only request
      const apiStart = logTiming('🌐 API call (text-only) started');

      result = await model.generateContent(prompt);

      logTiming('🌐 API call (text-only) complete', apiStart);
    }

    const parseStart = logTiming('🔍 Parsing response');
    const responseText = result.response.text();
    console.log(`${DEBUG_PREFIX} 📄 Raw response: "${responseText}"`);

    // Extract marker if present
    const markerMatch = responseText.match(/\[MARKER:(\w+)\]/);
    const marker = markerMatch ? markerMatch[1] : undefined;
    console.log(`${DEBUG_PREFIX} 🎯 Marker found:`, marker || 'none');

    // Clean response (remove marker tags for display)
    const cleanResponse = responseText.replace(/\[MARKER:\w+\]/g, '').trim();
    logTiming('🔍 Response parsed', parseStart);

    logTiming('✅ analyzeAndRespond() COMPLETE', totalStart);

    return { response: cleanResponse, marker };
  } catch (error) {
    console.error(`${DEBUG_PREFIX} ❌ Gemini API error:`, error);
    throw error;
  }
}

/**
 * Get initial greeting from AI
 */
export async function getInitialGreeting(): Promise<GeminiResponse> {
  if (!model) {
    return {
      response: "Point your camera at the patient. I'll guide you through the assessment.",
    };
  }

  try {
    const result = await model.generateContent(
      `${SYSTEM_PROMPT}

This is the start of a new emergency. The user just opened the app and is pointing their camera at someone who may need help. Give a brief initial instruction to begin the assessment. Keep it under 20 words.`
    );

    const responseText = result.response.text();
    const markerMatch = responseText.match(/\[MARKER:(\w+)\]/);

    return {
      response: responseText.replace(/\[MARKER:\w+\]/g, '').trim(),
      marker: markerMatch ? markerMatch[1] : undefined,
    };
  } catch (error) {
    console.error('Failed to get initial greeting:', error);
    return {
      response: "Point your camera at the patient. Are they responsive?",
    };
  }
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here';
}

/**
 * Get a brief patient description from an image
 * Used for emergency call to describe the patient
 */
export async function getPatientDescription(imageBase64: string): Promise<string> {
  console.log(`${DEBUG_PREFIX} 👤 Getting patient description...`);

  if (!model) {
    return 'Patient description unavailable - AI not configured';
  }

  try {
    const prompt = `Look at this image and provide a VERY BRIEF description of the person for emergency services. Include:
- Apparent gender
- Approximate age range
- Ethnicity/skin tone
- Any notable features visible

Keep it under 20 words. Example: "Adult male, appears 30-40 years old, light skin tone, wearing blue shirt"

Just describe what you see, nothing else.`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const description = result.response.text().trim();
    console.log(`${DEBUG_PREFIX} 👤 Patient description: ${description}`);
    return description;
  } catch (error) {
    console.error(`${DEBUG_PREFIX} ❌ Patient description error:`, error);
    return 'Patient description unavailable';
  }
}
