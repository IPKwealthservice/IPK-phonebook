// features/phone/screens/DialerScreen.tsx
import React, { useEffect } from "react";
import { BackHandler, View } from "react-native";
import { usePhoneCall } from "../hooks/usePhoneCall";
import DialPad from "../components/DialPad";
import CallFollowUpModal from "../components/CallFollowUpModal";

export default function DialerScreen() {
  const {
    phoneNumber,
    setPhoneNumber,
    startCall,
    isFollowUpOpen,
    closeFollowUp,
    callDurationSeconds,
    activeLead,
  } = usePhoneCall();

  // Block hardware back while follow-up modal is open
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isFollowUpOpen) {
        return true; // block
      }
      return false;
    });

    return () => sub.remove();
  }, [isFollowUpOpen]);

  return (
    <View style={{ flex: 1 }}>
      <DialPad
        visible={true}
        value={phoneNumber}
        onChange={setPhoneNumber}
        onClose={() => {}}
        onCall={(n) => {
          setPhoneNumber(n);
          startCall();
        }}
      />

      <CallFollowUpModal
        visible={isFollowUpOpen}
        durationSeconds={callDurationSeconds ?? 0}
        lead={activeLead}
        onClose={closeFollowUp}
      />
    </View>
  );
}
