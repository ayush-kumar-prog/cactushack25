import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useEffect } from 'react';
import { useVision } from './src/services/VisionService';
import { cactusEngine } from './src/services/CactusEngine';

import { useModelStore } from './src/services/MedGemmaService';

export default function App() {
  const { device, hasPermission, requestCameraPermission } = useVision();
  const { isDownloading, progress } = useModelStore();

  useEffect(() => {
    const init = async () => {
      await requestCameraPermission();
      await cactusEngine.start();
    };
    init();

    return () => {
      cactusEngine.stop();
    };
  }, []);

  if (!device || !hasPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Requesting Permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>Pulse Active</Text>
        <Text style={styles.subtext}>Check Terminal for Live Logs</Text>

        {isDownloading && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Downloading MedGemma: {progress}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        )}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  text: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 20,
    width: 200,
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    marginBottom: 5,
    fontSize: 12,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff00',
  }
});
