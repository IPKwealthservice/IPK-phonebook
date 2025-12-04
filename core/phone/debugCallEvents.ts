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

    console.log("📡 Debug listener mounted");

    // --- INCOMING ---
    const s1 = emitter.addListener("IncomingCall", (data) => {
      console.log("📥 IncomingCall event from native:", data);
    });

    // --- ANSWERED ---
    const s2 = emitter.addListener("CallAnswered", (data) => {
      console.log("✅ CallAnswered:", data);
    });

    // --- ENDED ---
    const s3 = emitter.addListener("CallEnded", (data) => {
      console.log("🛑 CallEnded:", data);
    });

    // --- MISSED ---
    const s4 = emitter.addListener("CallMissed", (data) => {
      console.log("❌ CallMissed:", data);
    });

    // --- ANY STATE ---
    const s5 = emitter.addListener("CallStateChanged", (data) => {
      console.log("🔄 CallStateChanged:", data);
    });

    return () => {
      console.log("🧹 Debug listener unmounted");
      s1.remove();
      s2.remove();
      s3.remove();
      s4.remove();
      s5.remove();
    };
  }, []);
}
