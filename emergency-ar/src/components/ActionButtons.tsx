import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Spacing, Shadows } from '../theme';

interface ActionButtonsProps {
  onEmergency: () => void;
  onViewReport: () => void;
  emergencyDisabled?: boolean;
  emergencyActive?: boolean;
}

export function ActionButtons({
  onEmergency,
  onViewReport,
  emergencyDisabled = false,
  emergencyActive = false,
}: ActionButtonsProps) {
  const handleEmergencyPress = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onEmergency();
  };

  const handleReportPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewReport();
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        {/* Emergency Button */}
        <TouchableOpacity
          style={[styles.buttonWrapper, styles.emergencyWrapper]}
          onPress={handleEmergencyPress}
          disabled={emergencyDisabled}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              emergencyActive
                ? [Colors.emergencyDark, Colors.emergency]
                : emergencyDisabled
                ? [Colors.surfaceElevated, Colors.surface]
                : [Colors.emergency, Colors.emergencyDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.emergencyButton,
              emergencyDisabled && styles.disabled,
              emergencyActive && styles.emergencyActive,
            ]}
          >
            {/* Phone icon */}
            <View style={styles.iconContainer}>
              <View style={styles.phoneIcon}>
                <View style={styles.phoneBody} />
                <View style={styles.phoneSpeaker} />
              </View>
            </View>
            <Text
              style={[
                styles.emergencyText,
                emergencyDisabled && styles.disabledText,
              ]}
            >
              {emergencyActive ? 'CALLING...' : 'Emergency'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Report Button */}
        <TouchableOpacity
          style={[styles.buttonWrapper, styles.reportWrapper]}
          onPress={handleReportPress}
          activeOpacity={0.8}
        >
          <View style={styles.reportButton}>
            {/* Document icon */}
            <View style={styles.iconContainer}>
              <View style={styles.docIcon}>
                <View style={styles.docBody} />
                <View style={styles.docLine} />
                <View style={styles.docLine} />
              </View>
            </View>
            <Text style={styles.reportText}>Report</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  buttonWrapper: {
    flex: 1,
  },
  emergencyWrapper: {
    flex: 1.5,
  },
  reportWrapper: {
    flex: 1,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.md,
  },
  emergencyActive: {
    ...Shadows.glow(Colors.glowEmergency),
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  phoneIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBody: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  phoneSpeaker: {
    position: 'absolute',
    top: 3,
    width: 6,
    height: 2,
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
  docIcon: {
    width: 16,
    height: 18,
    padding: 2,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  docBody: {
    display: 'none',
  },
  docLine: {
    width: 8,
    height: 1.5,
    backgroundColor: Colors.textSecondary,
    borderRadius: 1,
  },
  emergencyText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledText: {
    color: Colors.textTertiary,
  },
  reportText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
