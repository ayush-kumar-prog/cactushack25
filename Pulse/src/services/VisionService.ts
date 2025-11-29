import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useCallback } from 'react';

export const useVision = () => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');

    const requestCameraPermission = useCallback(async () => {
        const result = await requestPermission();
        return result;
    }, [requestPermission]);

    return {
        device,
        hasPermission,
        requestCameraPermission,
    };
};
