import { useState, useCallback, useRef } from 'react';
import { CameraView } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { analyzeAndRespond, isGeminiConfigured, getPatientDescription } from '../services/GeminiService';
import { speak } from '../services/TTSService';
import {
  PatientAssessment,
  createInitialAssessment,
  parseUserResponseForAssessment,
  shouldTriggerCPR,
  triggerEmergencyCall,
  sendFamilyAlert,
} from '../services/EmergencyService';
import type { Message } from '../types';

const DEBUG_PREFIX = '[DEBUG:CONV]';

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

interface UseConversationReturn {
  messages: Message[];
  currentInstruction: string;
  currentMarker: string | null;
  isProcessing: boolean;
  emergencyTriggered: boolean;
  patientAssessment: PatientAssessment;
  processUserInput: (userText: string) => Promise<void>;
  setInitialInstruction: (instruction: string) => void;
}

export function useConversation(
  cameraRef: React.RefObject<CameraView | null>
): UseConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [currentMarker, setCurrentMarker] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [patientAssessment, setPatientAssessment] = useState<PatientAssessment>(createInitialAssessment());
  const hasInitialImageRef = useRef(false); // Track if we've sent first image
  const emergencyTriggeredRef = useRef(false); // Prevent multiple triggers
  const lastImageBase64Ref = useRef<string | null>(null); // Store last image for patient description

  console.log(`${DEBUG_PREFIX} useConversation hook initialized`);
  console.log(`${DEBUG_PREFIX} Gemini configured:`, isGeminiConfigured());

  const processUserInput = useCallback(
    async (userText: string) => {
      const totalStart = logTiming('🚀 processUserInput() STARTED');
      console.log(`${DEBUG_PREFIX} 📥 User input: "${userText}"`);
      console.log(`${DEBUG_PREFIX} 📊 Current state - isProcessing:`, isProcessing, 'messagesCount:', messages.length);

      if (!userText.trim() || isProcessing) {
        console.log(`${DEBUG_PREFIX} ⚠️ Skipping - empty text or already processing`);
        return;
      }

      setIsProcessing(true);
      console.log(`${DEBUG_PREFIX} 🔄 Processing started...`);

      try {
        // Add user message to history
        const userMessage: Message = { role: 'User', text: userText };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        console.log(`${DEBUG_PREFIX} 💬 Added user message, total messages:`, updatedMessages.length);

        // Capture current camera frame - ONLY on first message or every 5th message
        // This is a major latency optimization: text-only Gemini is ~1-2s vs 6s with image
        let imageBase64: string | null = null;
        const shouldCaptureImage = !hasInitialImageRef.current || (updatedMessages.length % 5 === 0);
        console.log(`${DEBUG_PREFIX} 📷 Camera ref available:`, !!cameraRef.current);
        console.log(`${DEBUG_PREFIX} 📷 Should capture image:`, shouldCaptureImage, `(msg count: ${updatedMessages.length}, hasInitial: ${hasInitialImageRef.current})`);

        if (cameraRef.current && shouldCaptureImage) {
          const captureStart = logTiming('📷 Camera capture STARTED');
          try {
            // Capture at lower quality first
            const photo = await cameraRef.current.takePictureAsync({
              base64: false, // Don't get base64 yet - we'll resize first
              quality: 0.3,
              skipProcessing: true,
            });

            if (photo?.uri) {
              const resizeStart = logTiming('📷 Image resize STARTED');
              // Aggressively resize to 320x240 for fastest upload
              // Gemini can still analyze this effectively
              const resized = await ImageManipulator.manipulateAsync(
                photo.uri,
                [{ resize: { width: 320, height: 240 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
              );
              imageBase64 = resized.base64 || null;
              logTiming('📷 Image resize COMPLETE', resizeStart);
            }

            if (imageBase64) {
              hasInitialImageRef.current = true; // Mark that we've captured first image
              lastImageBase64Ref.current = imageBase64; // Store for patient description
            }
            logTiming('📷 Camera capture + resize COMPLETE', captureStart);
            console.log(`${DEBUG_PREFIX} 📷 Image base64 length:`, imageBase64?.length || 0);
            if (imageBase64) {
              console.log(`${DEBUG_PREFIX} 📷 Image size: ~${Math.round((imageBase64.length * 3/4) / 1024)}KB (resized to 320x240)`);
            }
          } catch (e) {
            console.warn(`${DEBUG_PREFIX} ⚠️ Failed to capture frame:`, e);
          }
        } else {
          console.log(`${DEBUG_PREFIX} 📷 SKIPPING image capture (text-only mode for speed)`);
        }

        // Update assessment from user's response
        const userAssessmentUpdates = parseUserResponseForAssessment(userText, patientAssessment);
        if (Object.keys(userAssessmentUpdates).length > 0) {
          console.log(`${DEBUG_PREFIX} 📋 Assessment updates from user:`, userAssessmentUpdates);
          setPatientAssessment(prev => ({ ...prev, ...userAssessmentUpdates }));
        }

        // Get AI response
        let response: string;
        let marker: string | undefined;

        console.log(`${DEBUG_PREFIX} 🤖 Gemini configured:`, isGeminiConfigured());

        if (isGeminiConfigured()) {
          const geminiStart = logTiming('🤖 Gemini API call STARTED');
          console.log(`${DEBUG_PREFIX} 🤖 Sending to Gemini with image: ${!!imageBase64}`);

          const result = await analyzeAndRespond(imageBase64, updatedMessages);

          logTiming('🤖 Gemini API call COMPLETE', geminiStart);
          response = result.response;
          marker = result.marker;
          console.log(`${DEBUG_PREFIX} 🤖 Response: "${response.substring(0, 80)}..."`);
          console.log(`${DEBUG_PREFIX} 🤖 Marker:`, marker || 'none');
        } else {
          // Fallback for demo without API key
          console.log(`${DEBUG_PREFIX} 📝 Using simulated response (no API key)`);
          response = getSimulatedResponse(userText, updatedMessages.length);
          marker = getSimulatedMarker(updatedMessages.length);
          console.log(`${DEBUG_PREFIX} 📝 Simulated response:`, response);
          console.log(`${DEBUG_PREFIX} 📝 Simulated marker:`, marker);
        }

        // Update state
        const stateStart = logTiming('📊 State update STARTED');
        const assistantMessage: Message = { role: 'Assistant', text: response };
        setMessages([...updatedMessages, assistantMessage]);
        setCurrentInstruction(response);
        setCurrentMarker(marker || null);
        logTiming('📊 State update COMPLETE', stateStart);

        // Speak the response (non-blocking - don't wait for audio to finish)
        const ttsStart = logTiming('🔊 TTS STARTED (non-blocking)');
        speak(response).then(() => {
          logTiming('🔊 TTS COMPLETE', ttsStart);
        });

        // Check if CPR should be triggered - initiate emergency call
        const currentAssessment = { ...patientAssessment, ...userAssessmentUpdates };
        if (shouldTriggerCPR(response, currentAssessment) && !emergencyTriggeredRef.current) {
          console.log(`${DEBUG_PREFIX} 🚨🚨🚨 CPR TRIGGERED - INITIATING EMERGENCY CALL 🚨🚨🚨`);
          emergencyTriggeredRef.current = true;
          setEmergencyTriggered(true);

          // Fire emergency services (non-blocking)
          triggerEmergencyServices(currentAssessment, lastImageBase64Ref.current);
        }

        logTiming('✅ processUserInput() COMPLETE (ready for next input)', totalStart);

      } catch (error) {
        console.error(`${DEBUG_PREFIX} ❌ Error processing input:`, error);
        const errorMessage = "I'm having trouble. Please try again.";
        setCurrentInstruction(errorMessage);
        await speak(errorMessage);
      } finally {
        setIsProcessing(false);
        console.log(`${DEBUG_PREFIX} 🏁 Processing finished`);
      }
    },
    [messages, isProcessing, cameraRef]
  );

  const setInitialInstruction = useCallback((instruction: string) => {
    console.log(`${DEBUG_PREFIX} 📢 setInitialInstruction: "${instruction.substring(0, 50)}..."`);
    setCurrentInstruction(instruction);
    const assistantMessage: Message = { role: 'Assistant', text: instruction };
    setMessages([assistantMessage]);
  }, []);

  // Helper to trigger emergency services (runs in background)
  const triggerEmergencyServices = async (
    assessment: PatientAssessment,
    imageBase64: string | null
  ) => {
    console.log(`${DEBUG_PREFIX} 🚨 Starting emergency services trigger...`);

    try {
      // 1. Get current location
      console.log(`${DEBUG_PREFIX} 📍 Getting location...`);
      let locationString = 'Location unavailable';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          locationString = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
          console.log(`${DEBUG_PREFIX} 📍 Location: ${locationString}`);
        }
      } catch (locError) {
        console.warn(`${DEBUG_PREFIX} ⚠️ Location error:`, locError);
      }

      // 2. Get patient description from Gemini (if we have an image)
      let patientDesc = 'Patient description unavailable';
      if (imageBase64 && isGeminiConfigured()) {
        console.log(`${DEBUG_PREFIX} 👤 Getting patient description from Gemini...`);
        try {
          patientDesc = await getPatientDescription(imageBase64);
          console.log(`${DEBUG_PREFIX} 👤 Patient description: ${patientDesc}`);
        } catch (descError) {
          console.warn(`${DEBUG_PREFIX} ⚠️ Patient description error:`, descError);
        }
      }

      // 3. Update assessment with location and description
      const fullAssessment: PatientAssessment = {
        ...assessment,
        location: locationString,
        patientDescription: patientDesc,
        timestamp: new Date().toISOString(),
      };

      console.log(`${DEBUG_PREFIX} 📋 Full assessment:`, fullAssessment);

      // 4. Trigger emergency call
      console.log(`${DEBUG_PREFIX} 📞 Calling emergency services...`);
      const callResult = await triggerEmergencyCall(fullAssessment);
      console.log(`${DEBUG_PREFIX} 📞 Emergency call result:`, callResult);

      // 5. Send family alert
      console.log(`${DEBUG_PREFIX} 📱 Sending family alert...`);
      const smsResult = await sendFamilyAlert(fullAssessment);
      console.log(`${DEBUG_PREFIX} 📱 Family alert result:`, smsResult);

      // Update assessment state
      setPatientAssessment(fullAssessment);

      // Announce to user
      speak("Emergency services have been contacted. Continue CPR.");

    } catch (error) {
      console.error(`${DEBUG_PREFIX} ❌ Emergency services error:`, error);
    }
  };

  return {
    messages,
    currentInstruction,
    currentMarker,
    isProcessing,
    emergencyTriggered,
    patientAssessment,
    processUserInput,
    setInitialInstruction,
  };
}

// Simulated responses for demo without API key
function getSimulatedResponse(userText: string, messageCount: number): string {
  const text = userText.toLowerCase();

  // Check for key phrases
  if (text.includes('not responsive') || text.includes('not moving') || text.includes('unconscious')) {
    return "Check if they are breathing. Look at their chest for movement.";
  }
  if (text.includes('not breathing') || text.includes('no breathing')) {
    return "Check for a pulse at their neck. Feel for 10 seconds.";
  }
  if (text.includes('no pulse') || text.includes("can't feel")) {
    return "Begin CPR now. Push hard and fast on the center of their chest.";
  }
  if (text.includes('breathing') || text.includes('pulse')) {
    return "Good. Keep monitoring them. Place them in the recovery position if breathing.";
  }

  // Default progression based on message count
  const responses = [
    "Is the person responsive? Shake their shoulders and call out.",
    "Check if they are breathing. Watch their chest for 10 seconds.",
    "Feel for a pulse at their neck. Use two fingers.",
    "Begin CPR if there's no pulse. Push hard and fast on the chest.",
    "Continue CPR. 30 compressions, then 2 breaths. Keep going.",
  ];

  return responses[Math.min(messageCount, responses.length - 1)];
}

function getSimulatedMarker(messageCount: number): string | undefined {
  const markers = [undefined, 'chest', 'neck', 'chest', 'chest'];
  return markers[Math.min(messageCount, markers.length - 1)];
}
