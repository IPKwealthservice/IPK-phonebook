import * as Linking from "expo-linking";
import { Alert } from "react-native";

/**
 * Normalize phone number by removing spaces, dashes, and parentheses
 */
const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return "+" + cleaned.slice(1).replace(/\+/g, "");
  }
  return cleaned.replace(/\+/g, "");
};

/**
 * Launch the platform dialer with the number prefilled.
 * On Android this uses the user's default Phone app.
 *
 * @param phoneNumber - The phone number to call
 * @returns Promise<boolean> - Returns true if the dialer was opened
 */
export const placeDirectCall = async (phoneNumber: string): Promise<boolean> => {
  const normalized = normalizePhone(phoneNumber);

  if (!normalized) {
    Alert.alert("Invalid Number", "Please provide a valid phone number");
    return false;
  }

  try {
    const url = `tel:${normalized}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Dialer", "This device cannot place phone calls.");
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error("Error placing call via dialer:", error);
    Alert.alert(
      "Call Failed",
      "Unable to launch the phone dialer. Please check your phone settings and try again."
    );
    return false;
  }
};

/**
 * Check if the device can make phone calls
 */
export const canMakePhoneCalls = async (): Promise<boolean> => {
  try {
    const url = "tel:+1234567890";
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
};
