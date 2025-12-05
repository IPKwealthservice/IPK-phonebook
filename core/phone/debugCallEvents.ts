import { useEffect } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";

const { CallEvents } = NativeModules;

export function useDebugCallEvents() {
  useEffect(() => {
    if (!CallEvents) {
      console.log("❌ Native module CallEvents not found");
      return;
    }

    const emitter = new NativeEventEmitter(CallEvents);

    console.log("📡 Debug listener mounted (Incoming + Outgoing)");

    /* ============================================================
     *  INCOMING EVENTS
     * ============================================================ */

    const s1 = emitter.addListener("IncomingCall", (data) => {
      console.log("📥 IncomingCall:", {
        number: data?.phoneNumber,
        time: new Date().toISOString(),
      });
    });

    const s2 = emitter.addListener("CallAnswered", (data) => {
      console.log("✅ CallAnswered (Incoming):", {
        number: data?.phoneNumber,
        time: new Date().toISOString(),
      });
    });

    const s3 = emitter.addListener("CallEnded", (data) => {
      console.log("🛑 CallEnded (Incoming):", {
        number: data?.phoneNumber,
        duration: data?.durationSeconds,
        time: new Date().toISOString(),
      });
    });

    const s4 = emitter.addListener("CallMissed", (data) => {
      console.log("❌ CallMissed (Incoming):", {
        number: data?.phoneNumber,
        time: new Date().toISOString(),
      });
    });

    /* ============================================================
     *  OUTGOING EVENTS
     * ============================================================ */

    const o1 = emitter.addListener("OutgoingCall", (data) => {
      console.log("📤 OutgoingCall:", {
        number: data?.phoneNumber,
        leadId: data?.leadId,
        leadName: data?.leadName,
        time: new Date().toISOString(),
      });
    });

    const o2 = emitter.addListener("OutgoingRinging", (data) => {
      console.log("🔔 OutgoingRinging:", {
        number: data?.phoneNumber,
        time: new Date().toISOString(),
      });
    });

    const o3 = emitter.addListener("OutgoingConnected", (data) => {
      console.log("🤙 OutgoingConnected:", {
        number: data?.phoneNumber,
        startedAt: data?.startedAt,
        time: new Date().toISOString(),
      });
    });

    const o4 = emitter.addListener("OutgoingEnded", (data) => {
      console.log("🛑 OutgoingEnded:", {
        number: data?.phoneNumber,
        duration: data?.durationSeconds,
        time: new Date().toISOString(),
      });
    });

    const o5 = emitter.addListener("OutgoingNotConnected", (data) => {
      console.log("❌ OutgoingNotConnected:", {
        number: data?.phoneNumber,
        reason: data?.reason, // busy / unreachable / switched off
        time: new Date().toISOString(),
      });
    });

    /* ============================================================
     *  RAW STATE EVENTS (Incoming + Outgoing)
     * ============================================================ */

    const s5 = emitter.addListener("CallStateChanged", (data) => {
      console.log("🔄 CallStateChanged:", {
        state: data?.state, // RINGING / OFFHOOK / IDLE
        isIncoming: data?.isIncoming,
        number: data?.phoneNumber,
        time: new Date().toISOString(),
      });
    });

    /* ============================================================
     *  CLEANUP
     * ============================================================ */

    return () => {
      console.log("🧹 Debug listener unmounted");

      s1.remove();
      s2.remove();
      s3.remove();
      s4.remove();
      s5.remove();

      o1.remove();
      o2.remove();
      o3.remove();
      o4.remove();
      o5.remove();
    };
  }, []);
}
