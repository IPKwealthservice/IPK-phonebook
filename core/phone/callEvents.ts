// core/phone/callEvents.ts
import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const { CallEvents } = NativeModules;

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
  } catch (e) {
    console.warn("Dialer setup failed", e);
  }
}
