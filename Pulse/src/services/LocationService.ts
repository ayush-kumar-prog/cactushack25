import * as Location from 'expo-location';

class LocationService {
    async requestPermissions(): Promise<boolean> {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log(`[LocationService] Permission status: ${status}`);
        return status === 'granted';
    }

    async getCurrentLocation(): Promise<Location.LocationObject | null> {
        try {
            const location = await Location.getCurrentPositionAsync({});
            console.log(`[LocationService] Location acquired: ${location.coords.latitude}, ${location.coords.longitude}`);
            return location;
        } catch (error) {
            console.error('[LocationService] Error getting location', error);
            return null;
        }
    }
}

export const locationService = new LocationService();
