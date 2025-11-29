import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius, Spacing } from '../theme';

interface StatusPillProps {
  isListening: boolean;
  isProcessing: boolean;
  emergencyTriggered?: boolean;
}

export function StatusPill({
  isListening,
  isProcessing,
  emergencyTriggered = false,
}: StatusPillProps) {
  const dotPulse = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Pulsing dot animation when listening
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(dotPulse, {
            toValue: 1.4,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotPulse, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      dotPulse.setValue(1);
    }
  }, [isListening]);

  // Spinning animation when processing
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

  const getStatusConfig = () => {
    if (emergencyTriggered) {
      return {
        dotColor: Colors.emergency,
        text: 'EMERGENCY ACTIVE',
        textColor: Colors.emergency,
      };
    }
    if (isProcessing) {
      return {
        dotColor: Colors.info,
        text: 'ANALYZING',
        textColor: Colors.info,
        showSpinner: true,
      };
    }
    if (isListening) {
      return {
        dotColor: Colors.success,
        text: 'LISTENING',
        textColor: Colors.success,
      };
    }
    return {
      dotColor: Colors.success,
      text: 'LIVE',
      textColor: Colors.textSecondary,
    };
  };

  const config = getStatusConfig();
  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
        <View style={styles.content}>
          {/* Status indicator */}
          {config.showSpinner ? (
            <Animated.View
              style={[
                styles.spinner,
                { transform: [{ rotate: spinRotation }] },
              ]}
            />
          ) : (
            <Animated.View
              style={[
                styles.dot,
                {
                  backgroundColor: config.dotColor,
                  transform: [{ scale: dotPulse }],
                },
              ]}
            />
          )}

          {/* Status text */}
          <Text style={[styles.text, { color: config.textColor }]}>
            {config.text}
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 100,
  },
  blurContainer: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  spinner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: Colors.info,
    marginRight: Spacing.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
