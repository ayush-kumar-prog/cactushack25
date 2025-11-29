import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { cactusEngine } from './src/services/CactusEngine';
import { CameraFeed } from './src/components/CameraFeed';
import { Overlay } from './src/components/Overlay';
import { useVision } from './src/services/VisionService';

export default function App() {
  const { requestCameraPermission } = useVision();

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

  return (
    <View style={styles.container}>
      <CameraFeed />
      <Overlay />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
