// features/phone/hooks/usePhoneCall.ts
import { useCallStore } from "@/features/phone/store/call.store";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
} from "react-native";

import { apolloClient } from "@/core/graphql/apolloClient";
import { auth } from "@/core/firebase/firebaseConfig";
import { MY_ASSIGNED_LEADS } from "@/core/graphql/queries";
import CallDetectorManager from "@huddle01/react-native-call-detection";
import CallLogs from "react-native-call-log";

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

const normalizeDigits = (value?: string | null): string =>
  (value ?? "").replace(/\D/g, "");

const phoneNumbersMatch = (left?: string | null, right?: string | null) => {
  const a = normalizeDigits(left);
  const b = normalizeDigits(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const minLength = Math.min(a.length, b.length);
  if (minLength < 5) return false;
  return (
    a.endsWith(b) ||
    b.endsWith(a) ||
    a.slice(-10) === b.slice(-10)
  );
};

type LeadDirectoryEntry = {
  id: string;
  name?: string | null;
  phone?: string | null;
  normalizedDigits: string;
};

const findLeadMatch = (
  phone: string | null,
  directory: LeadDirectoryEntry[]
): ActiveLead => {
  if (!phone) return null;
  const match = directory.find((entry) =>
    phoneNumbersMatch(phone, entry.phone)
  );
  if (!match) return null;
  return {
    id: match.id,
    name: match.name ?? undefined,
    phone: match.phone ?? undefined,
  };
};

const fetchLeadDirectory = async (): Promise<LeadDirectoryEntry[]> => {
  try {
    const token = await auth.currentUser?.getIdToken?.();
    if (!token) {
      console.log("Skipping lead directory fetch: no auth token");
      return [];
    }

    const { data } = await apolloClient.query({
      query: MY_ASSIGNED_LEADS,
      variables: { page: 1, pageSize: 200 },
      fetchPolicy: "cache-first",
    });
    const items = (data as any)?.myAssignedLeads?.items ?? [];
    return items
      .filter((item: any) => item?.id && item?.phone)
      .map((item: any) => ({
        id: String(item.id),
        name: item?.name,
        phone: item?.phone,
        normalizedDigits: normalizeDigits(item?.phone),
      }));
  } catch (error) {
    console.warn("Failed to fetch lead directory for call matching", error);
    return [];
  }
};

const getMatchingCallLog = async (
  phone: string | null,
  startedAt?: number | null
): Promise<{ durationSeconds: number; connected: boolean } | null> => {
  if (Platform.OS !== "android" || !phone) {
    return null;
  }

  try {
    const normalizedTarget = normalizeDigits(phone);
    if (!normalizedTarget) return null;

    const entries: any[] = await CallLogs.load(30);
    const windowStart = startedAt ? startedAt - 20000 : null; // allow a small buffer

    const match = entries.find((entry) => {
      const digits = normalizeDigits(entry?.phoneNumber);
      const timestamp = Number(entry?.timestamp ?? 0);
      if (windowStart && timestamp && timestamp < windowStart) {
        return false;
      }
      return phoneNumbersMatch(normalizedTarget, digits);
    });

    if (!match) return null;

    const durationSeconds = Math.max(0, Number(match.duration ?? 0));
    const type = String(match.type ?? "").toUpperCase();
    const connected = durationSeconds > 0 && type !== "MISSED";

    return { durationSeconds, connected };
  } catch (error) {
    console.warn("Call log lookup failed", error);
    return null;
  }
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
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    ]);

    const hasPhoneState =
      granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const hasCallLog =
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const hasCallPhone =
      granted[PermissionsAndroid.PERMISSIONS.CALL_PHONE] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (hasPhoneState && hasCallLog && hasCallPhone) {
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
    const callPhoneDenied =
      granted[PermissionsAndroid.PERMISSIONS.CALL_PHONE] ===
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

    if (phoneStateDenied || callLogDenied || callPhoneDenied) {
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
  const [callConnectedAt, setCallConnectedAt] = useState<number | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number | null>(null);
  const [activeLead, setActiveLead] = useState<ActiveLead>(null);
  const [incomingCallNumber, setIncomingCallNumber] = useState<string | null>(
    null
  );
  const [callDetectionReady, setCallDetectionReady] = useState<boolean>(
    Platform.OS !== "android"
  );
  const [leadDirectory, setLeadDirectory] = useState<LeadDirectoryEntry[]>([]);

  const isCallingRef = useRef<boolean>(isCalling);
  const callStartedAtRef = useRef<number | null>(callStartedAt);
  const callConnectedAtRef = useRef<number | null>(null);
  const callDetectorRef = useRef<CallDetectorManager | null>(null);
  const incomingCallNumberRef = useRef<string | null>(null);
  const incomingMatchedLeadRef = useRef<ActiveLead>(null);
  const leadDirectoryRef = useRef<LeadDirectoryEntry[]>([]);
  const endCallCallback = useCallStore((state) => state.endCall);
  const startCallRecord = useCallStore((state) => state.startCall);
  const endCallRef = useRef(endCallCallback);
  const callOriginRef = useRef<"outgoing" | "incoming" | null>(null);
  const dialedNumberRef = useRef<string | null>(null);
  const activeLeadRef = useRef<ActiveLead>(null);
  const finalizingRef = useRef<boolean>(false);

  useEffect(() => {
    isCallingRef.current = isCalling;
  }, [isCalling]);

  useEffect(() => {
    callStartedAtRef.current = callStartedAt;
  }, [callStartedAt]);

  useEffect(() => {
    callConnectedAtRef.current = callConnectedAt;
  }, [callConnectedAt]);

  useEffect(() => {
    incomingCallNumberRef.current = incomingCallNumber;
  }, [incomingCallNumber]);

  useEffect(() => {
    endCallRef.current = endCallCallback;
  }, [endCallCallback]);

  useEffect(() => {
    activeLeadRef.current = activeLead;
  }, [activeLead]);

  useEffect(() => {
    if (!incomingCallNumber) {
      incomingMatchedLeadRef.current = null;
      return;
    }
    const matched = findLeadMatch(incomingCallNumber, leadDirectoryRef.current);
    if (matched) {
      incomingMatchedLeadRef.current = matched;
      setActiveLead(matched);
    }
  }, [incomingCallNumber, leadDirectory]);

  useEffect(() => {
    let cancelled = false;
    const loadDirectory = async () => {
      const entries = await fetchLeadDirectory();
      if (cancelled) return;
      leadDirectoryRef.current = entries;
      setLeadDirectory(entries);
    };
    loadDirectory();
    return () => {
      cancelled = true;
    };
  }, []);

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

    const finalizeCall = async () => {
      if (finalizingRef.current) return;
      finalizingRef.current = true;

      try {
        const connectedAt = callConnectedAtRef.current;
        const startedAt = callStartedAtRef.current;
        const isIncoming =
          callOriginRef.current === "incoming" || !!incomingCallNumberRef.current;
        const matchedLead = isIncoming
          ? incomingMatchedLeadRef.current
          : activeLeadRef.current;
        const targetNumber = isIncoming
          ? incomingCallNumberRef.current
          : dialedNumberRef.current;
        const hadDialedNumber = !!dialedNumberRef.current;
        const resolvedLead =
          matchedLead ?? findLeadMatch(targetNumber, leadDirectoryRef.current);

        if (connectedAt == null && startedAt == null) {
          setIsCalling(false);
          setIncomingCallNumber(null);
          setCallConnectedAt(null);
          setIsFollowUpOpen(false);
          dialedNumberRef.current = null;
          callOriginRef.current = null;
          incomingMatchedLeadRef.current = null;
          return;
        }

        let wasConnected = false;
        let durationSeconds: number | null = null;

        const logOutcome = await getMatchingCallLog(targetNumber, startedAt);
        if (logOutcome) {
          durationSeconds = logOutcome.durationSeconds;
          wasConnected = logOutcome.connected;
        }

        if (durationSeconds == null) {
          const timeToUse = connectedAt || startedAt;
          const seconds = Math.max(
            0,
            Math.round((Date.now() - (timeToUse ?? Date.now())) / 1000)
          );
          durationSeconds = seconds;
          wasConnected = wasConnected || !!connectedAt;
        }

        console.log(wasConnected ? "Call connected" : "Call not connected");

        setCallDurationSeconds(durationSeconds);
        setIsCalling(false);
        setCallStartedAt(null);
        setCallConnectedAt(null);
        setIncomingCallNumber(null);

        const shouldShowFollowUp = isIncoming ? !!resolvedLead : hadDialedNumber;
        if (shouldShowFollowUp) {
          setIsFollowUpOpen(true);
          if (resolvedLead) {
            setActiveLead(resolvedLead);
          }
        } else {
          setIsFollowUpOpen(false);
          if (isIncoming) {
            setActiveLead(null);
          }
        }

        endCallRef.current?.();
      } catch (error) {
        console.error("Failed to finalize call", error);
      } finally {
        dialedNumberRef.current = null;
        incomingMatchedLeadRef.current = null;
        callOriginRef.current = null;
        finalizingRef.current = false;
      }
    };

    const handleCallState = (state?: string, phoneNumber?: string) => {
      if (!state) {
        return;
      }

      const normalizedIncoming =
        phoneNumber && phoneNumber.length ? normalizePhone(phoneNumber) : null;

      console.log(`Call state changed: ${state}${normalizedIncoming ? ` - ${normalizedIncoming}` : ''}`);

      switch (state) {
        case "Incoming":
          callOriginRef.current = "incoming";
          setIncomingCallNumber(normalizedIncoming);
          if (!isCallingRef.current) {
            setIsCalling(true);
            const now = Date.now();
            setCallStartedAt(now);
            callStartedAtRef.current = now;
            setCallDurationSeconds(null);
            console.log("Incoming call detected - waiting for connection");
          }
          break;
        case "Dialing":
          callOriginRef.current = callOriginRef.current ?? "outgoing";
          if (!isCallingRef.current) {
            setIsCalling(true);
            const now = Date.now();
            setCallStartedAt(now);
            callStartedAtRef.current = now;
            setCallDurationSeconds(null);
            console.log("Dialing detected - waiting for connection");
          }
          break;
        case "Offhook":
          callOriginRef.current = callOriginRef.current ?? "outgoing";
          if (!isCallingRef.current) {
            setIsCalling(true);
            const now = Date.now();
            setCallStartedAt(now);
            callStartedAtRef.current = now;
            setCallDurationSeconds(null);
            console.log("Dialing detected - waiting for connection");
          }
          if (incomingCallNumberRef.current && !callConnectedAtRef.current) {
            const now = Date.now();
            setCallConnectedAt(now);
            callConnectedAtRef.current = now;
            console.log("Call connected (incoming answered)");
          }
          break;
        case "Connected":
          // This is when the call is ACTUALLY connected - start tracking from here
          if (!callConnectedAtRef.current) {
            const now = Date.now();
            setCallConnectedAt(now);
            callConnectedAtRef.current = now;
            console.log("Call CONNECTED - duration tracking started");
          }
          break;
        case "Disconnected":
        case "Missed":
        case "Idle":
        case "OFFHOOK_IDLE":
          finalizeCall().catch((error) =>
            console.error("Failed to finalize call", error)
          );
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
      callOriginRef.current = "outgoing";
      dialedNumberRef.current = normalized;
      incomingMatchedLeadRef.current = null;
      setIncomingCallNumber(null);
      const startTs = Date.now();
      setIsCalling(true);
      setCallStartedAt(startTs);
      callStartedAtRef.current = startTs;
      setCallConnectedAt(null);
      callConnectedAtRef.current = null;
      setCallDurationSeconds(null);

      if (opts?.leadId) {
        setActiveLead({
          id: String(opts.leadId),
          name: opts.leadName,
          phone: opts.phone ?? sourceNumber,
        });
      } else {
        setActiveLead(null);
      }

      // Record call start in store
      startCallRecord(sourceNumber);

      try {
        // Import placeDirectCall dynamically to avoid issues
        const { placeDirectCall } = await import("@/core/utils/directCall");
        
        console.log("Initiating direct call for:", normalized);
        const success = await placeDirectCall(normalized);
        
        if (!success) {
          dialedNumberRef.current = null;
          callOriginRef.current = null;
          setIsCalling(false);
          setCallStartedAt(null);
          callStartedAtRef.current = null;
          Alert.alert("Call Failed", "Unable to initiate the call.");
          return;
        }
        
        // Note: Call detection will automatically track:
        // - When call starts dialing
        // - When call connects (this is when we start tracking duration)
        // - When call ends (show follow-up modal with ACTUAL call duration)
      } catch (err) {
        console.error("Failed to initiate call", err);
        dialedNumberRef.current = null;
        callOriginRef.current = null;
        setIsCalling(false);
        setCallStartedAt(null);
        callStartedAtRef.current = null;
        Alert.alert("Dialer", "Failed to place the call.");
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
