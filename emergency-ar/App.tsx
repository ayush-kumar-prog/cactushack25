import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Alert,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
  Marker,
  SpeechBubble,
  ActionButtons,
  VoiceButton,
  StatusPill,
  DetectionOverlay,
  ReportModal,
} from './src/components';
import { useTTS, useVoiceInput, useConversation, useObjectDetection } from './src/hooks';
import { Colors, Spacing, BorderRadius } from './src/theme';

const DEBUG_PREFIX = '[DEBUG:APP]';

console.log(`${DEBUG_PREFIX} ==========================================`);
console.log(`${DEBUG_PREFIX} App.tsx loaded - EmergencyAR starting...`);
console.log(`${DEBUG_PREFIX} ==========================================`);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Marker positions based on body part (relative to camera view)
const MARKER_POSITIONS: Record<string, { x: number; y: number }> = {
  neck: { x: 0.5, y: 0.28 },
  chest: { x: 0.5, y: 0.42 },
  chin: { x: 0.5, y: 0.22 },
};

export default function App() {
  console.log(`${DEBUG_PREFIX} App component rendering...`);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  console.log(`${DEBUG_PREFIX} Camera permission state:`, permission);

  // Hooks
  const { speak } = useTTS();
  const {
    isListening,
    transcript,
    toggleListening,
    error: voiceError,
  } = useVoiceInput();
  const {
    currentInstruction,
    currentMarker,
    isProcessing,
    emergencyTriggered,
    patientAssessment,
    processUserInput,
    setInitialInstruction,
  } = useConversation(cameraRef);

  // Local state - declare before useObjectDetection which depends on these
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [hasGreeted, setHasGreeted] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraKey, setCameraKey] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isCameraMounted, setIsCameraMounted] = useState(false);

  // Object detection with HuggingFace (runs independently)
  const {
    detections,
    isDetecting,
    error: detectionError,
  } = useObjectDetection(cameraRef, {
    enabled: permission?.granted && isCameraMounted && appState === 'active',
    intervalMs: 1200, // Run detection every 1.2 seconds
    minConfidence: 0.4,
  });

  console.log(`${DEBUG_PREFIX} Hook states:`, {
    isListening,
    transcript: transcript?.substring(0, 30),
    voiceError,
    currentInstruction: currentInstruction?.substring(0, 30),
    currentMarker,
    isProcessing,
  });

  // Fix for camera not loading on reload - give native resource time to release
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCameraMounted(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(`${DEBUG_PREFIX} 📱 App state changed to:`, nextAppState);
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log(`${DEBUG_PREFIX} 📱 App came to foreground - remounting camera`);
        setCameraKey(prev => prev + 1);
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Request camera permission on mount
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Permission useEffect - granted:`, permission?.granted);
    if (!permission?.granted) {
      console.log(`${DEBUG_PREFIX} Requesting camera permission...`);
      requestPermission();
    }
  }, [permission]);

  // Initial greeting when camera permission is granted
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Greeting useEffect - permission.granted:`, permission?.granted, 'hasGreeted:', hasGreeted);
    if (permission?.granted && !hasGreeted) {
      console.log(`${DEBUG_PREFIX} Playing initial greeting...`);
      setHasGreeted(true);
      const greeting = "What can I help you with?";
      setInitialInstruction(greeting);
      speak(greeting);
    }
  }, [permission?.granted, hasGreeted, speak, setInitialInstruction]);

  // Process transcript when voice input completes
  const lastTranscriptRef = useRef('');
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Transcript useEffect - isListening:`, isListening, 'transcript:', transcript);
    if (!isListening && transcript && transcript !== lastTranscriptRef.current) {
      console.log(`${DEBUG_PREFIX} Processing new transcript:`, transcript);
      lastTranscriptRef.current = transcript;
      processUserInput(transcript);
    }
  }, [isListening, transcript, processUserInput]);

  // Calculate marker position based on camera layout
  const getMarkerPosition = useCallback(() => {
    if (!currentMarker || !cameraLayout.width) return null;
    const pos = MARKER_POSITIONS[currentMarker] || { x: 0.5, y: 0.4 };
    return {
      x: pos.x * cameraLayout.width,
      y: pos.y * cameraLayout.height,
      label: currentMarker,
    };
  }, [currentMarker, cameraLayout]);

  const markerPosition = getMarkerPosition();

  // Voice button handler - now uses toggle
  const handleVoicePress = useCallback(async () => {
    console.log(`${DEBUG_PREFIX} ========== VOICE BUTTON PRESSED ==========`);
    if (!isListening) {
      lastTranscriptRef.current = ''; // Reset so new transcript is processed
    }
    await toggleListening();
  }, [toggleListening, isListening]);

  // Emergency call handler
  const handleEmergencyCall = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Emergency Call",
      "This will contact emergency services with patient information.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          style: "destructive",
          onPress: async () => {
            Alert.alert("Demo", "Emergency services would be contacted with:\n\n• Patient status\n• Location coordinates\n• Assessment summary");
            await speak("Emergency services have been notified. Continue providing care.");
          },
        },
      ]
    );
  }, [speak]);

  const handleViewReport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReportModalVisible(true);
  }, []);

  // Permission handling - dark themed
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <View style={styles.permissionIcon}>
              <View style={styles.cameraIconBody} />
              <View style={styles.cameraIconLens} />
            </View>
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            EmergencyAR needs camera access to analyze the patient and guide you through emergency procedures.
          </Text>
          <View style={styles.permissionButton}>
            <View style={styles.permissionButtonGradient}>
              <Text style={styles.permissionButtonText} onPress={requestPermission}>
                Enable Camera
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }



  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full-bleed Camera Container */}
      <View
        style={styles.cameraContainer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCameraLayout({ width, height });
        }}
      >
        {appState === 'active' && isCameraMounted && (
          <CameraView
            key={cameraKey}
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onMountError={(e) => console.error(`${DEBUG_PREFIX} ❌ Camera mount error:`, e)}
          />
        )}

        {/* Vignette overlay for focus - Sharp edges for Nothing OS */}
        <View
          style={styles.vignette}
          pointerEvents="none"
        />

        {/* Status Pill */}
        <StatusPill
          isListening={isListening}
          isProcessing={isProcessing}
          emergencyTriggered={emergencyTriggered}
        />

        {/* Object Detection Overlay - HuggingFace powered */}
        <DetectionOverlay
          detections={detections}
          isDetecting={isDetecting}
          cameraLayout={cameraLayout}
        />

        {/* AR Overlay Layer */}
        <View style={styles.arOverlay} pointerEvents="none">
          {/* Marker */}
          {markerPosition && (
            <Marker
              x={markerPosition.x}
              y={markerPosition.y}
              label={markerPosition.label}
              isPulsing={currentMarker === 'chest'}
              markerType={currentMarker || undefined}
            />
          )}

          {/* Instruction Card */}
          <SpeechBubble text={currentInstruction} />
        </View>
      </View>

      {/* Bottom Control Area */}
      <View style={styles.controlArea}>
        {/* Transcript Display */}
        {transcript && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>You said</Text>
            <Text style={styles.transcript}>{transcript}</Text>
          </View>
        )}

        {/* Voice Button */}
        <VoiceButton
          isListening={isListening}
          isProcessing={isProcessing}
          onPress={handleVoicePress}
        />

        {/* Action Buttons */}
        <ActionButtons
          onEmergency={handleEmergencyCall}
          onViewReport={handleViewReport}
          emergencyActive={emergencyTriggered}
        />
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        patientAssessment={patientAssessment}
        emergencyTriggered={emergencyTriggered}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 24,
    overflow: 'hidden',
    margin: Spacing.sm,
  },
  camera: {
    flex: 1,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 24,
  },
  arOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  controlArea: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  transcriptContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  transcriptLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  transcript: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  // Permission screen styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  permissionIconContainer: {
    marginBottom: Spacing.xxl,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm, // Sharp corners
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  cameraIconBody: {
    width: 40,
    height: 30,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  cameraIconLens: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  permissionButton: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  permissionButtonGradient: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  permissionButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
});
