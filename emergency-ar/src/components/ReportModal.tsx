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
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius } from '../theme';

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
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      slideAnim.setValue(Dimensions.get('window').height);
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
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
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Report Card</Text>
            {emergencyTriggered && (
              <View style={styles.emergencyBadge}>
                <Text style={styles.emergencyText}>EMERGENCY SENT</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Vitals Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VITALS</Text>
              <View style={styles.vitalsList}>
                <VitalRow label="Responsive" value={formatValue(patientAssessment.responsive)} />
                <VitalRow label="Airway" value={formatValue(patientAssessment.airway)} />
                <VitalRow label="Breathing" value={formatValue(patientAssessment.breathing)} />
                <VitalRow label="Pulse" value={formatValue(patientAssessment.pulse)} />
              </View>
            </View>

            {/* Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DETAILS</Text>
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Patient Description</Text>
                <Text style={styles.detailValue}>
                  {patientAssessment.patientDescription || 'No description available'}
                </Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>Nothing Office, Kings Cross, London</Text>
              </View>

              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {patientAssessment.timestamp
                    ? new Date(patientAssessment.timestamp).toLocaleTimeString()
                    : new Date().toLocaleTimeString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareText}>SHARE REPORT</Text>
            </TouchableOpacity>

            <View style={styles.footerSpacer} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function VitalRow({ label, value }: { label: string; value: string }) {
  const isNormal = value.toLowerCase().includes('yes') ||
    value.toLowerCase().includes('clear') ||
    value.toLowerCase().includes('present') ||
    value.toLowerCase().includes('normal');

  return (
    <View style={styles.vitalRow}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={[
        styles.vitalValue,
        isNormal ? styles.valueNormal : styles.valueWarning
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
    paddingTop: Spacing.sm,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'monospace', // Nothing OS style
    letterSpacing: -1,
  },
  emergencyBadge: {
    backgroundColor: Colors.emergency,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emergencyText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    letterSpacing: 2,
    marginBottom: Spacing.lg,
    textTransform: 'uppercase',
  },
  vitalsList: {
    gap: Spacing.md,
  },
  vitalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceElevated,
  },
  vitalLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  valueNormal: {
    color: Colors.textPrimary,
  },
  valueWarning: {
    color: Colors.emergency,
  },
  detailBlock: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  detailValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  shareButton: {
    backgroundColor: Colors.textPrimary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  shareText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  footerSpacer: {
    height: 60,
  },
});
