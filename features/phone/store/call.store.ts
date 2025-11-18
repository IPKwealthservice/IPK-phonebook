import { create } from "zustand";

type CallInfo = {
  dialed: string;
  normalized: string;
  startedAt: number;
};

type CallState = {
  activeCall: CallInfo | null;
  startCall: (rawNumber: string) => void;
  endCall: () => void;
};

const normalizeNumber = (value: string) =>
  value.replace(/[\s\-()]/g, "");

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  startCall: (rawNumber) => {
    const trimmed = rawNumber.trim();
    if (!trimmed) return;
    const normalized = normalizeNumber(trimmed);
    set({
      activeCall: {
        dialed: trimmed,
        normalized,
        startedAt: Date.now(),
      },
    });
  },
  endCall: () => set({ activeCall: null }),
}));
