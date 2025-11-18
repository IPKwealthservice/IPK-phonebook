import { StyleSheet } from "react-native";

// Keep helpers scoped to DialPad to avoid leaking styles to other components.
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const baseKey = 84;

// Slightly smaller keypad footprint for a cleaner, more professional feel
const getKeySize = (w: number) => clamp(Math.floor(w * 0.17), 56, 84);

export const getKeySizeStyles = (w: number) => {
  const size = getKeySize(w);
  return { width: size, height: size, borderRadius: size / 2 } as const;
};

export const getActionIconSizeStyles = (w: number) => {
  const size = clamp(Math.round(getKeySize(w) * 0.68), 40, 60);
  return { width: size, height: size, borderRadius: size / 2 } as const;
};

export const getCallButtonSizeStyles = (w: number) => {
  const size = clamp(Math.round(getKeySize(w) * 1.0), 68, 92);
  return { width: size, height: size, borderRadius: size / 2 } as const;
};

export const getKeyLabelSizeStyles = (w: number) => {
  const ratio = getKeySize(w) / baseKey;
  const fontSize = clamp(Math.round(26 * ratio), 20, 30);
  return { fontSize } as const;
};

export const getKeyHintSizeStyles = (w: number) => {
  const ratio = getKeySize(w) / baseKey;
  const fontSize = clamp(Math.round(10 * ratio), 9, 12);
  return { fontSize } as const;
};

// Styles only used by DialPad; unique keys to avoid accidental reuse.
export const dpStyles = StyleSheet.create({
  overlayLayer: {
    zIndex: 50,
    elevation: 50,
  },
  scrollArea: {
    // Fill available vertical space so the keypad stays pinned
    // to the container bottom instead of floating mid-screen
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollAreaContent: {
    // Ensure content stretches when there's little to show,
    // keeping the keypad at the bottom of the screen
    flexGrow: 1,
    paddingBottom: 8,
  },
  numberContainer: {
    width: "100%",
    paddingHorizontal: 16,
    alignItems: "center",
    maxWidth: 360,
  },
  numberTextFit: {
    textAlign: "center",
    includeFontPadding: false,
    // Let RN shrink text to fit when the number gets long
    // Additional layout handled via props on Text (adjustsFontSizeToFit)
  },
  // Tighter spacing between suggestions card and keypad
  suggestionsTight: {
    marginBottom: 6,
  },
  padGridAfterSuggestions: {
    marginTop: 4,
  },
});

export default dpStyles;
