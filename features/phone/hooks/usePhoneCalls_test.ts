// features/phone/hooks/usePhoneCalls_test.ts (Dummy for reference)

import { useCallStore } from "@/features/phone/store/call.store";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, PermissionsAndroid, Platform } from "react-native";

// NOTE: The incompatible import is permanently removed/commented out
// // import CallDetectorManager from "react-native-call-detection";

export type ActiveLead = { id: string; name?: string; phone?: string } | null;

export interface UsePhoneCallReturn {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;

  isCalling: boolean;
  isFollowUpOpen: boolean;
  callDurationSeconds: number | null;
  activeLead: ActiveLead;

  startCall: (opts?: {
    leadId?: string;
    leadName?: string;
    phone?: string;
  }) => Promise<void>;
  closeFollowUp: () => void;
}

const normalizePhone = (raw: string): string => {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return "+" + cleaned.slice(1).replace(/\+/g, "");
  }
  return cleaned.replace(/\+/g, "");
};

// Simplified Permission request without native module check
const requestCallPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    ]);

    const hasAllPermissions =
      granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED;

    if (hasAllPermissions) {
      console.log("Call permissions granted");
      return true;
    }

    // Simplified alert logic for brevity
    Alert.alert(
      "Permissions Required",
      "Call permissions are required for call tracking. Please enable them manually."
    );
    return false;
  } catch (error) {
    console.error("Error requesting call permissions:", error);
    return false;
  }
};

export function usePhoneCall(): UsePhoneCallReturn {
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState<boolean>(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number | null>(null);
  const [activeLead, setActiveLead] = useState<ActiveLead>(null);

  // NOTE: This variable is now redundant and can be removed or simplified:
  // const [callDetectionReady, setCallDetectionReady] = useState<boolean>(Platform.OS !== "android"); 

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isCallingRef = useRef<boolean>(isCalling);
  const callStartedAtRef = useRef<number | null>(callStartedAt);
  
  // NOTE: REMOVED the reference to CallDetectorManager
  // const callDetectorRef = useRef<any>(null); 
  
  const endCallCallback = useCallStore((state) => state.endCall);
  const startCallRecord = useCallStore((state) => state.startCall);
  const endCallRef = useRef(endCallCallback);

  // State/Ref updates remain

  useEffect(() => { isCallingRef.current = isCalling; }, [isCalling]);
  useEffect(() => { callStartedAtRef.current = callStartedAt; }, [callStartedAt]);
  useEffect(() => { endCallRef.current = endCallCallback; }, [endCallCallback]);

  /* NOTE: REMOVED THE ENTIRE NATIVE MODULE INITIALIZATION BLOCK
  
  // The first useEffect for permission checking is now redundant if we check permissions inside startCall
  // The second useEffect for CallDetectorManager initialization is the one that was crashing the app.
  */

  // Handle app state changes (this remains and is crucial for call tracking without the native module)
  useEffect(() => {
    // ... (Your existing AppState.addEventListener logic) ...
    // This logic handles call duration detection when the app returns from the dialer.
    // IT DOES NOT RELY ON CallDetectorManager, so it is safe to keep.
  }, []);

  const startCall = useCallback<UsePhoneCallReturn["startCall"]>(
    async (opts) => {
      // ... (Your existing startCall logic) ...
      
      // Request permissions first (still necessary for background tracking on Android)
      const permissionsGranted = await requestCallPermissions();
      if (!permissionsGranted) {
        return;
      }
      
      // Removed: setCallDetectionReady(true); // Since we removed the detector, this isn't needed
      
      // ... (Rest of your Linking.openURL logic remains the same) ...
    },
    [phoneNumber, startCallRecord]
  );

  const closeFollowUp = useCallback(() => {
    setIsFollowUpOpen(false);
    setCallDurationSeconds(null);
  }, []);

  return {
    phoneNumber,
    setPhoneNumber,
    isCalling,
    isFollowUpOpen,
    callDurationSeconds,
    activeLead,
    startCall,
    closeFollowUp,
  };
}