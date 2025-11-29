import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { COLORS, FONTS, SPACING } from '../theme';
import { useIncidentContext } from '../store/IncidentContext';
import { useModelStore } from '../services/MedGemmaService';
import { useTranscriptStore } from '../store/TranscriptStore';
import { TypewriterText } from './TypewriterText';

export const Overlay = () => {
    const { status, patient, environment } = useIncidentContext();
    const { isDownloading, progress } = useModelStore();
    const transcriptItems = useTranscriptStore(state => state.items);

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Top Status Bar */}
            <View style={styles.header}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
                <View style={styles.gpsContainer}>
                    <Text style={styles.gpsText}>
                        {environment.gps ? `${environment.gps.lat.toFixed(4)}, ${environment.gps.long.toFixed(4)}` : 'GPS Acquiring...'}
                    </Text>
                </View>
            </View>

            {/* Center Reticle (Placeholder) */}
            <View style={styles.reticleContainer} pointerEvents="none">
                <View style={styles.reticle} />
            </View>

            {/* Bottom Info Area */}
            <View style={styles.footer}>
                {isDownloading ? (
                    <View style={styles.downloadContainer}>
                        <Text style={styles.downloadText}>INITIALIZING AI CORE... {progress}%</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                    </View>
                ) : (
                    <View style={styles.transcriptContainer}>
                        {transcriptItems.length === 0 && (
                            <Text style={styles.transcriptText}>
                                {status === 'SCANNING' ? "Scanning for patient..." : "Listening..."}
                            </Text>
                        )}
                        {transcriptItems.map((item) => (
                            <View key={item.id} style={{ marginBottom: 8 }}>
                                <Text style={[styles.senderText, { color: item.sender === 'ai' ? COLORS.red : COLORS.grey }]}>
                                    {item.sender === 'ai' ? 'PULSE' : 'YOU'}
                                </Text>
                                <TypewriterText
                                    text={item.text}
                                    style={styles.transcriptText}
                                    speed={20}
                                />
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        padding: SPACING.m,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: SPACING.xl,
    },
    statusBadge: {
        backgroundColor: COLORS.red,
        paddingHorizontal: SPACING.s,
        paddingVertical: SPACING.xs,
        borderRadius: 4,
    },
    statusText: {
        color: COLORS.white,
        fontFamily: FONTS.dot,
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    gpsContainer: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: SPACING.xs,
        borderRadius: 4,
    },
    gpsText: {
        color: COLORS.grey,
        fontFamily: FONTS.mono,
        fontSize: 12,
    },
    reticleContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reticle: {
        width: 200,
        height: 200,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    footer: {
        marginBottom: SPACING.xl,
    },
    downloadContainer: {
        width: '100%',
    },
    downloadText: {
        color: COLORS.white,
        fontFamily: FONTS.mono,
        fontSize: 12,
        marginBottom: SPACING.xs,
    },
    progressBar: {
        height: 2,
        backgroundColor: COLORS.darkGrey,
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.white,
    },
    transcriptContainer: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: SPACING.m,
        borderRadius: 8,
        borderLeftWidth: 2,
        borderLeftColor: COLORS.red,
    },
    transcriptText: {
        color: COLORS.white,
        fontFamily: FONTS.mono,
        fontSize: 16,
    },
    senderText: {
        fontFamily: FONTS.dot,
        fontSize: 10,
        marginBottom: 2,
        letterSpacing: 1,
    }
});
