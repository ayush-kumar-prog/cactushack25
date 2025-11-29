import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius, Spacing, Shadows } from '../theme';

// Import the hands emoji image for CPR marker
const handsEmoji = require('../../assets/handsemoji.png');

interface MarkerProps {
  x: number;
  y: number;
  label?: string;
  isPulsing?: boolean;
  markerType?: 'chest' | 'neck' | 'chin' | string;
}

export function Marker({ x, y, label, isPulsing = false, markerType }: MarkerProps) {
  // Expanding ring animations
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.8)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.8)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0.8)).current;

  // Core pulse animation
  const coreScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  // Entry animation
  const entryScale = useRef(new Animated.Value(0)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entryScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Expanding rings animation
  useEffect(() => {
    const createRingAnimation = (
      scaleAnim: Animated.Value,
      opacityAnim: Animated.Value,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 2.5,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const ringAnimations = Animated.parallel([
      createRingAnimation(ring1Scale, ring1Opacity, 0),
      createRingAnimation(ring2Scale, ring2Opacity, 500),
      createRingAnimation(ring3Scale, ring3Opacity, 1000),
    ]);

    ringAnimations.start();

    return () => ringAnimations.stop();
  }, []);

  // Core pulse animation
  useEffect(() => {
    if (isPulsing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(coreScale, {
              toValue: 1.15,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(coreScale, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.6,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isPulsing]);

  const isChestMarker = markerType === 'chest';
  const markerColor = isChestMarker ? Colors.emergency : Colors.info;
  const glowColor = isChestMarker ? Colors.glowEmergency : Colors.glowInfo;

  // Get icon for marker type
  const getMarkerIcon = () => {
    switch (markerType) {
      case 'chest':
        return <Image source={handsEmoji} style={styles.handsImage} />;
      case 'neck':
        return <Text style={styles.iconText}>+</Text>;
      case 'chin':
        return <Text style={styles.iconText}>^</Text>;
      default:
        return <View style={[styles.defaultDot, { backgroundColor: markerColor }]} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - MARKER_SIZE / 2,
          top: y - MARKER_SIZE / 2,
          opacity: entryOpacity,
          transform: [{ scale: entryScale }],
        },
      ]}
    >
      {/* Expanding rings */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: markerColor,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: markerColor,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: markerColor,
            opacity: ring3Opacity,
            transform: [{ scale: ring3Scale }],
          },
        ]}
      />

      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: glowColor,
            opacity: glowOpacity,
            transform: [{ scale: coreScale }],
          },
        ]}
      />

      {/* Core marker */}
      <Animated.View
        style={[
          styles.core,
          {
            backgroundColor: markerColor,
            transform: [{ scale: coreScale }],
            ...Shadows.glow(glowColor),
          },
        ]}
      >
        {getMarkerIcon()}
      </Animated.View>

      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <BlurView intensity={40} tint="dark" style={styles.labelBlur}>
            <Text style={styles.labelText}>{label.toUpperCase()}</Text>
          </BlurView>
        </View>
      )}
    </Animated.View>
  );
}

const MARKER_SIZE = 70;
const CORE_SIZE = 56;
const RING_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
  },
  glow: {
    position: 'absolute',
    width: CORE_SIZE + 20,
    height: CORE_SIZE + 20,
    borderRadius: (CORE_SIZE + 20) / 2,
  },
  core: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  handsImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  iconText: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
  },
  defaultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -32,
    alignItems: 'center',
  },
  labelBlur: {
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
});
