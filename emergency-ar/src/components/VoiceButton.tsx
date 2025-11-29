import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows, BorderRadius } from '../theme';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onPress: () => void;
}

export function VoiceButton({
  isListening,
  isProcessing,
  onPress,
}: VoiceButtonProps) {
  // Ripple animations for listening state
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  // Pulse animation for idle state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Processing spinner
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Ripple animation when listening
  useEffect(() => {
    if (isListening) {
      const createRipple = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const rippleAnimation = Animated.parallel([
        createRipple(ripple1, 0),
        createRipple(ripple2, 500),
        createRipple(ripple3, 1000),
      ]);

      rippleAnimation.start();

      return () => {
        rippleAnimation.stop();
        ripple1.setValue(0);
        ripple2.setValue(0);
        ripple3.setValue(0);
      };
    }
  }, [isListening]);

  // Subtle pulse animation for idle state
  useEffect(() => {
    if (!isListening && !isProcessing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, isProcessing]);

  // Spinning animation for processing
  useEffect(() => {
    if (isProcessing) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isProcessing]);

  const handlePress = async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getButtonColors = (): [string, string] => {
    if (isProcessing) return [Colors.info, '#0066CC'];
    if (isListening) return [Colors.success, Colors.successDark];
    return [Colors.surfaceElevated, Colors.surface];
  };

  const getGlowColor = (): string => {
    if (isProcessing) return Colors.glowInfo;
    if (isListening) return Colors.glowSuccess;
    return 'transparent';
  };

  const getRippleColor = (): string => {
    return isListening ? Colors.success : Colors.info;
  };

  // Interpolations for ripples
  const createRippleStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.5],
        }),
      },
    ],
  });

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Ripple effects */}
      {isListening && (
        <>
          <Animated.View
            style={[
              styles.ripple,
              { backgroundColor: getRippleColor() },
              createRippleStyle(ripple1),
            ]}
          />
          <Animated.View
            style={[
              styles.ripple,
              { backgroundColor: getRippleColor() },
              createRippleStyle(ripple2),
            ]}
          />
          <Animated.View
            style={[
              styles.ripple,
              { backgroundColor: getRippleColor() },
              createRippleStyle(ripple3),
            ]}
          />
        </>
      )}

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonOuter,
          {
            transform: [{ scale: pulseAnim }],
            ...Shadows.glow(getGlowColor()),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePress}
          disabled={isProcessing}
          style={styles.touchable}
        >
          <LinearGradient
            colors={getButtonColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {/* Border ring */}
            <View style={styles.borderRing}>
              {/* Processing spinner ring */}
              {isProcessing && (
                <Animated.View
                  style={[
                    styles.spinnerRing,
                    { transform: [{ rotate: spinRotation }] },
                  ]}
                />
              )}

              {/* Icon */}
              <View style={styles.iconContainer}>
                {isProcessing ? (
                  <View style={styles.processingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                ) : (
                  <MicIcon isListening={isListening} />
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Label */}
      <Animated.Text
        style={[
          styles.label,
          isListening && styles.labelActive,
          isProcessing && styles.labelProcessing,
        ]}
      >
        {isProcessing
          ? 'Analyzing...'
          : isListening
          ? 'Listening...'
          : 'Tap to Speak'}
      </Animated.Text>
    </View>
  );
}

// Microphone icon component
function MicIcon({ isListening }: { isListening: boolean }) {
  return (
    <View style={styles.micIcon}>
      {/* Mic body */}
      <View
        style={[
          styles.micBody,
          isListening && styles.micBodyActive,
        ]}
      />
      {/* Mic stand */}
      <View style={styles.micStandContainer}>
        <View
          style={[
            styles.micStand,
            isListening && styles.micStandActive,
          ]}
        />
        <View
          style={[
            styles.micBase,
            isListening && styles.micBaseActive,
          ]}
        />
      </View>
    </View>
  );
}

const BUTTON_SIZE = 80;
const RIPPLE_SIZE = BUTTON_SIZE;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  ripple: {
    position: 'absolute',
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
  },
  buttonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
  },
  touchable: {
    flex: 1,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderRing: {
    width: BUTTON_SIZE - 4,
    height: BUTTON_SIZE - 4,
    borderRadius: (BUTTON_SIZE - 4) / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerRing: {
    position: 'absolute',
    width: BUTTON_SIZE - 4,
    height: BUTTON_SIZE - 4,
    borderRadius: (BUTTON_SIZE - 4) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: Colors.textPrimary,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    alignItems: 'center',
  },
  micBody: {
    width: 16,
    height: 24,
    backgroundColor: Colors.textPrimary,
    borderRadius: 8,
  },
  micBodyActive: {
    backgroundColor: Colors.textPrimary,
  },
  micStandContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  micStand: {
    width: 2,
    height: 6,
    backgroundColor: Colors.textPrimary,
  },
  micStandActive: {
    backgroundColor: Colors.textPrimary,
  },
  micBase: {
    width: 16,
    height: 2,
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
  micBaseActive: {
    backgroundColor: Colors.textPrimary,
  },
  processingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textPrimary,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  label: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: -0.24,
  },
  labelActive: {
    color: Colors.success,
  },
  labelProcessing: {
    color: Colors.info,
  },
});
