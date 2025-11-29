import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Spacing } from '../theme';

interface PatientAssessment {
  responsive?: string;
  airway?: string;
  breathing?: string;
  pulse?: string;
  patientDescription?: string;
  location?: string;
  timestamp?: string;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  patientAssessment: PatientAssessment;
  emergencyTriggered: boolean;
}

export function ReportModal({
  visible,
  onClose,
  patientAssessment,
  emergencyTriggered,
}: ReportModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const reportText = `EMERGENCY REPORT - EmergencyAR

Patient Assessment:
• Responsive: ${patientAssessment.responsive || 'Not assessed'}
• Airway: ${patientAssessment.airway || 'Not assessed'}
• Breathing: ${patientAssessment.breathing || 'Not assessed'}
• Pulse: ${patientAssessment.pulse || 'Not assessed'}

Patient: ${patientAssessment.patientDescription || 'No description'}

Location: Nothing Office, Kings Cross, London

Time: ${patientAssessment.timestamp ? new Date(patientAssessment.timestamp).toLocaleString() : new Date().toLocaleString()}

Sent via EmergencyAR`;

    try {
      await Share.share({
        message: reportText,
        title: 'Emergency Report',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const formatValue = (value: string | undefined) => {
    if (!value || value === '') return 'Not assessed';
    return value;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <View style={styles.crossIcon}>
                <View style={styles.crossVertical} />
                <View style={styles.crossHorizontal} />
              </View>
            </View>
            <Text style={styles.headerTitle}>PATIENT REPORT</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Banner */}
          {emergencyTriggered && (
            <View style={styles.statusBanner}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                Information shared with emergency services
              </Text>
            </View>
          )}

          {/* Assessment Grid */}
          <View style={styles.assessmentGrid}>
            <View style={styles.assessmentRow}>
              <AssessmentItem
                label="RESPONSIVE"
                value={formatValue(patientAssessment.responsive)}
              />
              <AssessmentItem
                label="AIRWAY"
                value={formatValue(patientAssessment.airway)}
              />
            </View>
            <View style={styles.assessmentRow}>
              <AssessmentItem
                label="BREATHING"
                value={formatValue(patientAssessment.breathing)}
              />
              <AssessmentItem
                label="PULSE"
                value={formatValue(patientAssessment.pulse)}
              />
            </View>
          </View>

          {/* Patient Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PATIENT</Text>
            <Text style={styles.sectionValue}>
              {patientAssessment.patientDescription || 'No description available'}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>LOCATION</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.locationText}>
                Nothing Office, Kings Cross, London
              </Text>
            </View>
          </View>

          {/* Timestamp */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TIME</Text>
            <Text style={styles.sectionValue}>
              {patientAssessment.timestamp
                ? new Date(patientAssessment.timestamp).toLocaleString()
                : new Date().toLocaleString()}
            </Text>
          </View>

          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareIcon}>↗</Text>
            <Text style={styles.shareText}>SHARE REPORT</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function AssessmentItem({ label, value }: { label: string; value: string }) {
  const isNormal = value.toLowerCase().includes('yes') ||
                   value.toLowerCase().includes('clear') ||
                   value.toLowerCase().includes('present') ||
                   value.toLowerCase().includes('normal');
  const isCritical = value.toLowerCase().includes('no') ||
                     value.toLowerCase().includes('absent') ||
                     value.toLowerCase().includes('not');

  return (
    <View style={styles.assessmentItem}>
      <Text style={styles.assessmentLabel}>{label}</Text>
      <Text
        style={[
          styles.assessmentValue,
          isNormal && styles.assessmentNormal,
          isCritical && styles.assessmentCritical,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: SCREEN_WIDTH - Spacing.lg * 2,
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 3,
    height: 14,
    backgroundColor: Colors.background,
    borderRadius: 1,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 14,
    height: 3,
    backgroundColor: Colors.background,
    borderRadius: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1,
    fontFamily: 'monospace',
    marginLeft: Spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  assessmentGrid: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  assessmentRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  assessmentItem: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assessmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  assessmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  assessmentNormal: {
    color: '#4CAF50',
  },
  assessmentCritical: {
    color: Colors.accent,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: Spacing.sm,
  },
  shareIcon: {
    fontSize: 16,
    color: Colors.accent,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
});
