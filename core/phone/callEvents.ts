// core/phone/callEvents.ts
import { NativeEventEmitter, NativeModules, Platform } from "react-native";

type NativeCallEvents = {
  initialize: () => Promise<boolean> | boolean;
  startListening: () => void;
  stopListening: () => void;
  isDefaultDialer: () => Promise<boolean>;
  requestDefaultDialer: () => Promise<boolean>;
  registerPhoneAccount: () => Promise<boolean>;
  getLastCallForNumber: (
    number: string,
    sinceMs: number
  ) => Promise<{ number?: string; durationSeconds?: number; type?: string } | null>;
  getRecentCalls: (
    limit: number
  ) => Promise<{ number?: string; timestamp?: number; durationSeconds?: number; type?: string }[]>;
};

const { CallEvents } = NativeModules as { CallEvents?: NativeCallEvents };

export type IncomingCallPayload = {
  phoneNumber?: string;
};

export type CallStatePayload = {
  state: string;
  phoneNumber?: string;
};

const emitter =
  Platform.OS === "android" && CallEvents
    ? new NativeEventEmitter(CallEvents)
    : null;

export const subscribeIncomingCall = (
  handler: (payload: IncomingCallPayload) => void
) => {
  if (!emitter) return () => {};
  const sub = emitter.addListener("IncomingCall", handler);
  return () => sub.remove();
};

export const subscribeCallState = (
  handler: (payload: CallStatePayload) => void
) => {
  if (!emitter) return () => {};
  const sub = emitter.addListener("CallStateChanged", handler);
  return () => sub.remove();
};

export const subscribeCallAnswered = (
  handler: (payload: IncomingCallPayload) => void
) => {
  if (!emitter) return () => {};
  const sub = emitter.addListener("CallAnswered", handler);
  return () => sub.remove();
};

export const subscribeCallEnded = (
  handler: (payload: IncomingCallPayload) => void
) => {
  if (!emitter) return () => {};
  const sub = emitter.addListener("CallEnded", handler);
  return () => sub.remove();
};

export const subscribeCallMissed = (
  handler: (payload: IncomingCallPayload) => void
) => {
  if (!emitter) return () => {};
  const sub = emitter.addListener("CallMissed", handler);
  return () => sub.remove();
};

export async function ensureDialerSetup() {
  if (Platform.OS !== "android" || !CallEvents) return;

  try {
    const isDefault: boolean = await CallEvents.isDefaultDialer();
    await CallEvents.registerPhoneAccount();
    if (!isDefault) {
      await CallEvents.requestDefaultDialer();
    }
    await CallEvents.initialize();
  } catch (e) {
    console.warn("Dialer setup failed", e);
  }
}

export async function lookupCallLog(
  number: string,
  sinceMs: number
): Promise<{ durationSeconds: number; type?: string } | null> {
  if (Platform.OS !== "android" || !CallEvents) return null;
  try {
    const result = await CallEvents.getLastCallForNumber(number, sinceMs);
    if (!result || typeof result.durationSeconds !== "number") return null;
    return {
      durationSeconds: Math.max(0, Math.round(result.durationSeconds)),
      type: result.type,
    };
  } catch (e) {
    console.warn("Call log lookup failed", e);
    return null;
  }
}

export async function fetchRecentCalls(limit = 15) {
  if (Platform.OS !== "android" || !CallEvents) return [];
  try {
    const rows = await CallEvents.getRecentCalls(limit);
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => ({
        number: row?.number ?? "",
        timestamp: typeof row?.timestamp === "number" ? row.timestamp : 0,
        durationSeconds:
          typeof row?.durationSeconds === "number" ? row.durationSeconds : 0,
        type: row?.type,
      }))
      .filter((row) => !!row.number);
  } catch (e) {
    console.warn("Recent call lookup failed", e);
    return [];
  }
}
