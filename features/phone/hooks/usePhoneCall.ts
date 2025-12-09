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
import {
  ensureDialerSetup,
  lookupCallLog,
  subscribeCallAnswered,
  subscribeCallEnded,
  subscribeCallMissed,
  subscribeCallState,
  subscribeIncomingCall,
} from "@/core/phone/callEvents";
import { recordLeadCallLog } from "@/features/leads/services/interactions.service";

export type ActiveLead = { id: string; name?: string; phone?: string } | null;
type CallStatus = "connected" | "missed" | "no-answer" | "unreachable" | null;

export interface UsePhoneCallReturn {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;

  isCalling: boolean;
  isFollowUpOpen: boolean;
  callStatus: CallStatus;
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

    const windowStart = startedAt ? startedAt - 20000 : 0;
    const match = await lookupCallLog(normalizedTarget, windowStart);
    if (!match) return null;

    const durationSeconds = Math.max(0, Number(match.durationSeconds ?? 0));
    const type = String(match.type ?? "").toUpperCase();
    const connected =
      durationSeconds > 0 &&
      type !== "3" && // CallLog.MISSED_TYPE
      type !== "MISSED";

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
    const phoneStateStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
    );
    const callLogStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );

    if (phoneStateStatus && callLogStatus) {
      console.log("Call permissions already granted");
      return true;
    }

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
  const [callStatus, setCallStatus] = useState<CallStatus>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callConnectedAt, setCallConnectedAt] = useState<number | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState<number | null>(
    null
  );
  const [activeLead, setActiveLead] = useState<ActiveLead>(null);
  const [incomingCallNumber, setIncomingCallNumber] = useState<string | null>(
    null
  );
  const [leadDirectory, setLeadDirectory] = useState<LeadDirectoryEntry[]>([]);

  const isCallingRef = useRef<boolean>(isCalling);
  const callStartedAtRef = useRef<number | null>(callStartedAt);
  const callConnectedAtRef = useRef<number | null>(null);
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
  const callEndReasonRef = useRef<"unreachable" | null>(null);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // One-time dialer + permission setup on Android
  useEffect(() => {
    if (Platform.OS !== "android") return;

    (async () => {
      const ok = await requestCallPermissions();
      if (!ok) return;
      await ensureDialerSetup();
    })();
  }, []);

  const finalizeCall = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }

    const reschedule = (delayMs = 1200) => {
      finalizingRef.current = false;
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
      }
      finalizeTimerRef.current = setTimeout(() => {
        finalizeTimerRef.current = null;
        finalizeCall().catch((e) => console.error(e));
      }, delayMs);
    };

    try {
      const connectedAt = callConnectedAtRef.current;
      const startedAt = callStartedAtRef.current;
      const isIncoming =
        callOriginRef.current === "incoming" ||
        !!incomingCallNumberRef.current;
      const isOutgoing = callOriginRef.current === "outgoing";
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
        setCallStatus(null);
        callEndReasonRef.current = null;
        dialedNumberRef.current = null;
        callOriginRef.current = null;
        incomingMatchedLeadRef.current = null;
        return;
      }

      let wasConnected = false;
      let durationSeconds: number | null = null;

      if (
        isOutgoing &&
        startedAt &&
        Date.now() - startedAt < 1200 &&
        Platform.OS === "android"
      ) {
        reschedule(1200);
        return;
      }

      const logOutcome = await getMatchingCallLog(targetNumber, startedAt);
      if (logOutcome) {
        durationSeconds = logOutcome.durationSeconds;
        wasConnected = logOutcome.connected;
      }

      if (durationSeconds == null) {
        if (connectedAt) {
          const seconds = Math.max(
            0,
            Math.round((Date.now() - connectedAt) / 1000)
          );
          durationSeconds = seconds;
          wasConnected = true;
        } else if (startedAt) {
          const seconds = Math.max(
            0,
            Math.round((Date.now() - startedAt) / 1000)
          );
          durationSeconds = seconds;
        } else {
          durationSeconds = 0;
        }
      }

      console.log(wasConnected ? "Call connected" : "Call not connected");
      if (durationSeconds != null) {
        console.log(
          `Call duration ${durationSeconds}s${
            resolvedLead
              ? ` with ${resolvedLead.name ?? resolvedLead.phone ?? "lead"}`
              : ""
          }`
        );
      }

      const status: CallStatus = wasConnected
        ? "connected"
        : callEndReasonRef.current === "unreachable"
        ? "unreachable"
        : isIncoming
        ? "missed"
        : "no-answer";

      if (!wasConnected) {
        const leadIdForLog =
          resolvedLead?.id ?? activeLeadRef.current?.id ?? null;
        const phoneForLog =
          targetNumber ??
          resolvedLead?.phone ??
          activeLeadRef.current?.phone ??
          incomingCallNumberRef.current ??
          null;

        if (leadIdForLog && phoneForLog) {
          try {
            await recordLeadCallLog({
              leadId: leadIdForLog,
              phoneNumber: phoneForLog,
              direction: isIncoming ? "INCOMING" : "OUTGOING",
              status: "MISSED",
              failReason:
                callEndReasonRef.current === "unreachable"
                  ? "BUSY"
                  : "NO_ANSWER",
              occurredAt: new Date().toISOString(),
            });
          } catch (err) {
            console.warn("Failed to record missed call", err);
          }
        }
      }

      setCallStatus(status);
      setCallDurationSeconds(durationSeconds ?? 0);
      setIsCalling(false);
      setCallStartedAt(null);
      setCallConnectedAt(null);
      setIncomingCallNumber(null);
      callEndReasonRef.current = null;

      // Popup rule:
      // - Outgoing: open only when connected
      // - Incoming: open only when connected (missed -> no popup)
      const followUpLead = resolvedLead ?? activeLeadRef.current;
      const shouldShowFollowUp = wasConnected && !!followUpLead;

      if (shouldShowFollowUp && followUpLead) {
        setIsFollowUpOpen(true);
        setActiveLead(followUpLead);
      } else {
        setIsFollowUpOpen(false);
        if (isIncoming) {
          setActiveLead(null);
        }
      }

      endCallRef.current?.();

      if (Platform.OS === "android" && isOutgoing) {
        Linking.openURL("ipkphonebook://").catch(() => {});
      }

      if (!wasConnected && !isIncoming) {
        const message =
          status === "unreachable"
            ? "Not reachable / switched off"
            : "Not Connected";
        Alert.alert("Call status", message);
      }
    } catch (error) {
      console.error("Failed to finalize call", error);
    } finally {
      dialedNumberRef.current = null;
      incomingMatchedLeadRef.current = null;
      callOriginRef.current = null;
      callEndReasonRef.current = null;
      finalizingRef.current = false;
    }
  }, []);

  // Subscribe to native call events from ConnectionService
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const unsubIncoming = subscribeIncomingCall(({ phoneNumber }) => {
      const normalized = phoneNumber ? normalizePhone(phoneNumber) : null;
      callOriginRef.current = "incoming";
      setIncomingCallNumber(normalized);
      if (!isCallingRef.current) {
        setIsCalling(true);
        const now = Date.now();
        setCallStartedAt(now);
        callStartedAtRef.current = now;
        setCallDurationSeconds(null);
        console.log("Incoming call detected via ConnectionService");
      }
    });

    const unsubState = subscribeCallState(({ state }) => {
      const s = state.toLowerCase();

      if (s === "disconnected") {
        callEndReasonRef.current = "unreachable";
        if (!finalizeTimerRef.current) {
          finalizeTimerRef.current = setTimeout(() => {
            finalizeTimerRef.current = null;
            finalizeCall().catch((e) => console.error(e));
          }, 1200);
        }
        return;
      }

      if (s === "active" || s === "connected") {
        if (finalizeTimerRef.current) {
          clearTimeout(finalizeTimerRef.current);
          finalizeTimerRef.current = null;
        }
        if (!callConnectedAtRef.current) {
          const now = Date.now();
          setCallConnectedAt(now);
          callConnectedAtRef.current = now;
          console.log("Call CONNECTED (ConnectionService)");
        }
        if (!isCallingRef.current) {
          setIsCalling(true);
          const now = Date.now();
          setCallStartedAt(now);
          callStartedAtRef.current = now;
        }
      }
    });

    const unsubAnswered = subscribeCallAnswered(() => {
      if (!callConnectedAtRef.current) {
        const now = Date.now();
        setCallConnectedAt(now);
        callConnectedAtRef.current = now;
        console.log("Call ANSWERED (ConnectionService)");
      }
    });

    const unsubEnded = subscribeCallEnded(() => {
      console.log("Call ENDED (ConnectionService)");
      finalizeCall().catch((e) => console.error(e));
    });

    const unsubMissed = subscribeCallMissed(() => {
      console.log("Call MISSED (ConnectionService)");
      finalizeCall().catch((e) => console.error(e));
    });

    return () => {
      unsubIncoming();
      unsubState();
      unsubAnswered();
      unsubEnded();
      unsubMissed();
    };
  }, [finalizeCall]);

  const startCall = useCallback<UsePhoneCallReturn["startCall"]>(
    async (opts) => {
      const sourceNumber = opts?.phone ?? phoneNumber;
      const normalized = normalizePhone(sourceNumber);

      if (!normalized) {
        Alert.alert("Dialer", "Enter a phone number first");
        return;
      }

      const permissionsGranted = await requestCallPermissions();
      if (!permissionsGranted) {
        return;
      }

      await ensureDialerSetup();

      callOriginRef.current = "outgoing";
      dialedNumberRef.current = normalized;
      incomingMatchedLeadRef.current = null;
      callEndReasonRef.current = null;
      setIncomingCallNumber(null);
      const startTs = Date.now();
      setIsCalling(true);
      setIsFollowUpOpen(false);
      setCallStatus(null);
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

      startCallRecord(sourceNumber);

      try {
        const { placeDirectCall } = await import("@/core/utils/directCall");
        console.log("Initiating direct call for:", normalized);
        const success = await placeDirectCall(normalized);

        if (!success) {
          dialedNumberRef.current = null;
          callOriginRef.current = null;
          setCallStatus(null);
          setIsCalling(false);
          setCallStartedAt(null);
          callStartedAtRef.current = null;
          Alert.alert("Call Failed", "Unable to initiate the call.");
          return;
        }
      } catch (err) {
        console.error("Failed to initiate call", err);
        dialedNumberRef.current = null;
        callOriginRef.current = null;
        setCallStatus(null);
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

  useEffect(() => {
    return () => {
      if (finalizeTimerRef.current) {
        clearTimeout(finalizeTimerRef.current);
        finalizeTimerRef.current = null;
      }
    };
  }, []);

  return {
    phoneNumber,
    setPhoneNumber,
    isCalling,
    isFollowUpOpen,
    callStatus,
    callDurationSeconds,
    activeLead,
    startCall,
    closeFollowUp,
  };
}
