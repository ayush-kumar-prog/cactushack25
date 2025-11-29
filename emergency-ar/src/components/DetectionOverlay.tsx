import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors, BorderRadius } from '../theme';
import { DetectedObject } from '../hooks/useObjectDetection';

interface DetectionOverlayProps {
  detections: DetectedObject[];
  isDetecting: boolean;
  cameraLayout: { width: number; height: number };
  // Original image dimensions from the detection
  imageWidth?: number;
  imageHeight?: number;
}

// Map COCO labels to more relevant emergency labels for display
const LABEL_MAP: Record<string, string> = {
  'person': 'PERSON',
  'face': 'FACE',
  'hand': 'HAND',
  'cell phone': 'PHONE',
  'bottle': 'BOTTLE',
  'cup': 'CUP',
  'chair': 'CHAIR',
  'couch': 'COUCH',
  'bed': 'BED',
  'dining table': 'TABLE',
  'laptop': 'LAPTOP',
  'keyboard': 'KEYBOARD',
  'tv': 'TV',
  'remote': 'REMOTE',
  'book': 'BOOK',
  'clock': 'CLOCK',
  'backpack': 'BACKPACK',
  'handbag': 'BAG',
  'tie': 'TIE',
  'suitcase': 'SUITCASE',
};

function BoundingBox({
  detection,
  cameraLayout,
  index,
}: {
  detection: DetectedObject;
  cameraLayout: { width: number; height: number };
  index: number;
}) {
  const { box, label, score } = detection;

  // Calculate target dimensions
  const scaleX = cameraLayout.width / 640;
  const scaleY = cameraLayout.height / 480;

  const left = box.xmin * scaleX;
  const top = box.ymin * scaleY;
  const width = (box.xmax - box.xmin) * scaleX;
  const height = (box.ymax - box.ymin) * scaleY;

  const targetLeft = Math.max(0, Math.min(left, cameraLayout.width - 20));
  const targetTop = Math.max(0, Math.min(top, cameraLayout.height - 20));
  const targetWidth = Math.max(40, Math.min(width, cameraLayout.width - targetLeft));
  const targetHeight = Math.max(40, Math.min(height, cameraLayout.height - targetTop));

  // Animation values
  const leftAnim = useRef(new Animated.Value(targetLeft)).current;
  const topAnim = useRef(new Animated.Value(targetTop)).current;
  const widthAnim = useRef(new Animated.Value(targetWidth)).current;
  const heightAnim = useRef(new Animated.Value(targetHeight)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate to new positions
    Animated.parallel([
      Animated.timing(leftAnim, {
        toValue: targetLeft,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(topAnim, {
        toValue: targetTop,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(widthAnim, {
        toValue: targetWidth,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(heightAnim, {
        toValue: targetHeight,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [targetLeft, targetTop, targetWidth, targetHeight]);

  const displayLabel = LABEL_MAP[label.toLowerCase()] || label.toUpperCase();
  const confidence = Math.round(score * 100);

  const isPersonRelated = ['person', 'face', 'hand'].includes(label.toLowerCase());
  const boxColor = isPersonRelated ? Colors.accent : Colors.textPrimary;

  return (
    <Animated.View
      style={[
        styles.boundingBox,
        {
          left: leftAnim,
          top: topAnim,
          width: widthAnim,
          height: heightAnim,
          borderColor: boxColor,
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.corner, styles.cornerTL, { backgroundColor: boxColor }]} />
      <View style={[styles.corner, styles.cornerTR, { backgroundColor: boxColor }]} />
      <View style={[styles.corner, styles.cornerBL, { backgroundColor: boxColor }]} />
      <View style={[styles.corner, styles.cornerBR, { backgroundColor: boxColor }]} />

      <View style={[styles.labelContainer, { backgroundColor: boxColor }]}>
        <Text style={styles.labelText}>{displayLabel}</Text>
        <Text style={styles.confidenceText}>{confidence}%</Text>
      </View>
    </Animated.View>
  );
}

export function DetectionOverlay({
  detections,
  isDetecting,
  cameraLayout,
}: DetectionOverlayProps) {
  if (!cameraLayout.width || !cameraLayout.height) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isDetecting && styles.statusDotActive]} />
        <Text style={styles.statusText}>
          {isDetecting ? 'SCANNING' : `${detections.length} DETECTED`}
        </Text>
      </View>

      {detections.map((detection, index) => (
        <BoundingBox
          key={`${detection.label}-${index}`} // Stable key to prevent re-mounting
          detection={detection}
          cameraLayout={cameraLayout}
          index={index}
        />
      ))}

      {/* Scan lines effect when detecting */}
      {isDetecting && (
        <View style={styles.scanOverlay}>
          <ScanLine />
        </View>
      )}
    </View>
  );
}

// Animated scan line
function ScanLine() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const screenHeight = Dimensions.get('window').height;

  return (
    <Animated.View
      style={[
        styles.scanLine,
        {
          transform: [
            {
              translateY: translateY.interpolate({
                inputRange: [0, 1],
                outputRange: [0, screenHeight],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  statusContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.textSecondary,
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: Colors.accent,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'inherit',
    backgroundColor: 'transparent',
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: 'inherit',
    backgroundColor: 'transparent',
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'inherit',
    backgroundColor: 'transparent',
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: 'inherit',
    backgroundColor: 'transparent',
  },
  labelContainer: {
    position: 'absolute',
    top: -24,
    left: -2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 6,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.background,
    opacity: 0.8,
    fontFamily: 'monospace',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});
