import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../theme';

interface SpeechBubbleProps {
  text: string;
  visible?: boolean;
}

export function SpeechBubble({ text, visible = true }: SpeechBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const prevTextRef = useRef(text);

  // Animate in when text changes
  useEffect(() => {
    if (text && text !== prevTextRef.current) {
      // Reset and animate
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      prevTextRef.current = text;
    }
  }, [text]);

  // Initial mount animation
  useEffect(() => {
    if (text) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  if (!visible || !text) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.blurContainer}>
        <View style={styles.innerContainer}>
          {/* AI indicator */}
          <View style={styles.aiIndicator}>
            <View style={styles.aiDot} />
            <Text style={styles.aiLabel}>AI ASSISTANT</Text>
          </View>

          {/* Instruction text */}
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  blurContainer: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.background, // Solid black
  },
  innerContainer: {
    padding: Spacing.lg,
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.xs,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 0, // Square dot
    backgroundColor: Colors.accent,
    marginRight: Spacing.sm,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 26,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
});
