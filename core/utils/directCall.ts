/**
 * Direct Call Utility
 * Provides functionality to directly place phone calls without opening the dialer
 */

import * as Linking from 'expo-linking';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

/**
 * Normalize phone number by removing spaces, dashes, and parentheses
 */
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\+/g, '');
  }
  return cleaned.replace(/\+/g, '');
};

/**
 * Request CALL_PHONE permission on Android
 */
const requestCallPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: 'Phone Call Permission',
        message: 'This app needs permission to make phone calls directly.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('CALL_PHONE permission granted');
      return true;
    } else {
      console.log('CALL_PHONE permission denied');
      Alert.alert(
        'Permission Required',
        'Phone call permission is required to make direct calls. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return false;
    }
  } catch (err) {
    console.error('Error requesting CALL_PHONE permission:', err);
    return false;
  }
};

/**
 * Place a direct phone call using Android ACTION_CALL intent or iOS tel: scheme
 * This bypasses the dialer and directly initiates the call
 * 
 * @param phoneNumber - The phone number to call
 * @returns Promise<boolean> - Returns true if call was initiated successfully
 */
export const placeDirectCall = async (phoneNumber: string): Promise<boolean> => {
  const normalized = normalizePhone(phoneNumber);

  if (!normalized) {
    Alert.alert('Invalid Number', 'Please provide a valid phone number');
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      // Request CALL_PHONE permission first
      const hasPermission = await requestCallPermission();
      if (!hasPermission) {
        return false;
      }

      // Primary: try ACTION_CALL for immediate calling (may trigger SIM picker)
      const intentUrl = `intent:#Intent;action=android.intent.action.CALL;data=tel:${normalized};end`;

      try {
        await Linking.openURL(intentUrl);
        console.log('Direct call initiated for:', normalized);
        return true;
      } catch (intentError) {
        // Fallback: try tel: (with CALL_PHONE permission this often dials immediately)
        console.log('Intent URL failed, using tel: URL with CALL_PHONE permission');
        const telUrl = `tel:${normalized}`;
        await Linking.openURL(telUrl);
        return true;
      }
    } else if (Platform.OS === 'ios') {
      // iOS uses tel: scheme but requires user confirmation for security
      // Note: iOS doesn't allow fully automated calls for security reasons
      const url = `tel:${normalized}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (!canOpen) {
        Alert.alert('Error', 'This device cannot make phone calls');
        return false;
      }

      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert('Unsupported Platform', 'Phone calls are not supported on this platform');
      return false;
    }
  } catch (error) {
    console.error('Error placing direct call:', error);
    Alert.alert(
      'Call Failed',
      'Unable to place the call. Please check your phone settings and try again.'
    );
    return false;
  }
};

/**
 * Check if the device can make phone calls
 */
export const canMakePhoneCalls = async (): Promise<boolean> => {
  try {
    const url = 'tel:+1234567890';
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
};
