import { HomeDashboardScreen } from "@/features/home/screens";
import { useDebugCallEvents } from "@/core/phone/debugCallEvents";
import React from "react";

export default function IndexScreen() {
  // 👇 This activates your call event logs
  useDebugCallEvents();

  return <HomeDashboardScreen />;
}
