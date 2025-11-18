// features/phone/hooks/usePhoneCall.ts
import { useCallStore } from "@/features/phone/store/call.store";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
} from "react-native";

import CallDetectorManager from "@huddle01/react-native-call-detection";

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

const requestCallPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return true;
  }

  try {
    // Check current permission status first
    const phoneStateStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
    );
    const callLogStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );

    // If both already granted, return early
    if (phoneStateStatus && callLogStatus) {
      console.log("Call permissions already granted");
      return true;
    }

    // Request permissions
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    ]);

    const hasPhoneState =
      granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const hasCallLog =
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (hasPhoneState && hasCallLog) {
      console.log("Call permissions granted");
      return true;
    }

    // Check if permissions were denied permanently
    const phoneStateDenied =
      granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
    const callLogDenied =
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] ===
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

    if (phoneStateDenied || callLogDenied) {
      Alert.alert(
        "Permissions Required",
        "Call tracking permissions are required. Please enable them in Settings > Apps > IPK PhoneBook > Permissions.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Permissions Required",
        "Call permissions are required to track call progress and duration on Android."
      );
    }

    console.warn("Call permissions denied", granted);
    return false;
  } catch (error) {
    console.error("Error requesting call permissions:", error);
    Alert.alert(
      "Error",
      "Failed to request call permissions. Please try again."
    );
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
  const [incomingCallNumber, setIncomingCallNumber] = useState<string | null>(
    null
  );
  const [callDetectionReady, setCallDetectionReady] = useState<boolean>(
    Platform.OS !== "android"
  );

  const isCallingRef = useRef<boolean>(isCalling);
  const callStartedAtRef = useRef<number | null>(callStartedAt);
  const callDetectorRef = useRef<CallDetectorManager | null>(null);
  const incomingCallNumberRef = useRef<string | null>(null);
  const endCallCallback = useCallStore((state) => state.endCall);
  const startCallRecord = useCallStore((state) => state.startCall);
  const endCallRef = useRef(endCallCallback);

  useEffect(() => {
    isCallingRef.current = isCalling;
  }, [isCalling]);

  useEffect(() => {
    callStartedAtRef.current = callStartedAt;
  }, [callStartedAt]);

  useEffect(() => {
    incomingCallNumberRef.current = incomingCallNumber;
  }, [incomingCallNumber]);

  useEffect(() => {
    endCallRef.current = endCallCallback;
  }, [endCallCallback]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    let active = true;
    const verifyPermissions = async () => {
      try {
        const hasPhoneState = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
        );
        if (active && hasPhoneState) {
          setCallDetectionReady(true);
        }
      } catch (error) {
        console.error("Error while checking call permissions:", error);
      }
    };

    verifyPermissions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    if (!callDetectionReady) {
      callDetectorRef.current?.dispose();
      callDetectorRef.current = null;
      return;
    }

    const finalizeCall = () => {
      const startedAt = callStartedAtRef.current;
      if (startedAt == null) {
        setIsCalling(false);
        setIncomingCallNumber(null);
        return;
      }

      const seconds = Math.max(
        1,
        Math.round((Date.now() - startedAt) / 1000)
      );
      console.log("Call ended detected, duration:", seconds);
      setCallDurationSeconds(seconds);
      setIsCalling(false);
      setCallStartedAt(null);
      setIncomingCallNumber(null);
      setIsFollowUpOpen(true);
      endCallRef.current?.();
      if (incomingCallNumberRef.current) {
        setActiveLead(null);
      }
    };

    const handleCallState = (state?: string, phoneNumber?: string) => {
      if (!state) {
        return;
      }

      const normalizedIncoming =
        phoneNumber && phoneNumber.length ? normalizePhone(phoneNumber) : null;

      switch (state) {
        case "Incoming":
          setIncomingCallNumber(normalizedIncoming);
          if (!isCallingRef.current) {
            setIsCalling(true);
            setCallStartedAt(Date.now());
            setCallDurationSeconds(null);
          }
          break;
        case "Dialing":
        case "Connected":
        case "Offhook":
          if (!isCallingRef.current) {
            setIsCalling(true);
            setCallStartedAt(Date.now());
            setCallDurationSeconds(null);
          }
          break;
        case "Disconnected":
        case "Missed":
        case "Idle":
        case "OFFHOOK_IDLE":
          finalizeCall();
          break;
        default:
          break;
      }
    };

    let detector: CallDetectorManager | null = null;
    try {
      detector = new CallDetectorManager(handleCallState, true, (error) => {
        console.warn("Call detection permission denied", error);
      });
      callDetectorRef.current = detector;
    } catch (error) {
      console.error("Failed to start call detection", error);
    }

    return () => {
      detector?.dispose();
      if (callDetectorRef.current === detector) {
        callDetectorRef.current = null;
      }
    };
  }, [callDetectionReady]);

  const startCall = useCallback<UsePhoneCallReturn["startCall"]>(
    async (opts) => {
      const sourceNumber = opts?.phone ?? phoneNumber;
      const normalized = normalizePhone(sourceNumber);

      if (!normalized) {
        Alert.alert("Dialer", "Enter a phone number first");
        return;
      }

      // Request permissions first
      const permissionsGranted = await requestCallPermissions();
      if (!permissionsGranted) {
        return;
      }
      setCallDetectionReady(true);

      if (opts?.leadId) {
        setActiveLead({
          id: String(opts.leadId),
          name: opts.leadName,
          phone: opts.phone ?? sourceNumber,
        });
      } else {
        setActiveLead(null);
      }

      // Use tel: scheme - opens dialer with number pre-filled
      // Note: On Android, user still needs to press call button due to security restrictions
      // Some devices support tel: with # to auto-dial, but it's not reliable
      const url = `tel:${normalized}`;
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          Alert.alert("Dialer", "This device cannot place phone calls.");
          return;
        }

        // Set calling state BEFORE opening dialer
        setIsCalling(true);
        const startTime = Date.now();
        setCallStartedAt(startTime);
        setCallDurationSeconds(null);
        startCallRecord(sourceNumber);

        console.log("Opening dialer for:", normalized);
        await Linking.openURL(url);
        
        // Note: App will go to background when dialer opens
        // We'll detect return via AppState listener
      } catch (err) {
        console.error("Failed to open dialer", err);
        setIsCalling(false);
        setCallStartedAt(null);
        Alert.alert("Dialer", "Failed to open the phone app.");
      }
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
