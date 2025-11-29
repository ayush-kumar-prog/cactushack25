import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { cactusEngine } from '../services/CactusEngine';

export const CameraFeed = () => {
    const device = useCameraDevice('back');
    const camera = useRef<Camera>(null);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (camera.current) {
                try {
                    // Take a low-quality snapshot for speed
                    const photo = await camera.current.takePhoto({
                        flash: 'off',
                        enableShutterSound: false
                    });

                    // Send to engine
                    // We need to pass the path or base64. 
                    // MedGemmaService expects data. 
                    // For now, let's pass the path.
                    await cactusEngine.processFrame(photo.path);
                } catch (e) {
                    console.warn("Failed to capture frame:", e);
                }
            }
        }, 5000); // Run every 5 seconds for now

        return () => clearInterval(interval);
    }, []);

    if (!device) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white' }}>No Camera Device Found</Text>
            </View>
        );
    }

    return (
        <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            photo={true} // Enable photo capture
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
