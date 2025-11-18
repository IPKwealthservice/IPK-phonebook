import React, {
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext
} from "react";
import { useColorScheme as useRNColorScheme, View } from "react-native";

type Theme = {
  scheme: "light" | "dark";
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    primary: string;
    border: string;
    error: string;
    success: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radii: { sm: number; md: number; lg: number };
  fontSizes: { sm: number; md: number; lg: number; xl: number };
  // Theme controls
  followSystem?: boolean;
  setScheme?: (scheme: "light" | "dark" | "system") => void;
  toggleScheme?: () => void;
};

const lightTheme: Omit<Theme, "scheme"> = {
  colors: {
    background: "#F9FAFB", // gray.50
    card: "#FFFFFF",
    text: "#101828",
    muted: "#667085", // gray.500
    primary: "#465FFF", // brand.500
    border: "#D0D5DD", // gray.300
    error: "#F04438", // error.500
    success: "#12B76A" // success.500
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radii: { sm: 8, md: 12, lg: 16 },
  fontSizes: { sm: 12, md: 14, lg: 16, xl: 20 }
};

const darkTheme: Omit<Theme, "scheme"> = {
  colors: {
    background: "#0C111D", // gray.950
    card: "#1A2231", // gray.dark from tailwind config
    text: "#ECEDEE",
    muted: "#9BA1A6",
    primary: "#7592FF", // brand.400
    border: "#344054", // gray.700
    error: "#F97066", // error.400
    success: "#32D583" // success.400
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radii: { sm: 8, md: 12, lg: 16 },
  fontSizes: { sm: 12, md: 14, lg: 16, xl: 20 }
};

const ThemeContext = createContext<Theme>({
  scheme: "light",
  ...lightTheme
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useRNColorScheme(); // "light" | "dark"

  // NativeWind uses a 'className' "dark" on a parent view to switch themes.
  const [isDark, setIsDark] = useState(scheme === "dark");
  useEffect(() => setIsDark(scheme === "dark"), [scheme]);

  // Allow manual override (light/dark/system)
  const [override, setOverride] = useState<"system" | "light" | "dark">("system");
  const resolvedScheme = override === "system" ? (isDark ? "dark" : "light") : override;

  const theme = useMemo<Theme>(() => {
    const base = resolvedScheme === "dark" ? darkTheme : lightTheme;
    return {
      scheme: resolvedScheme,
      ...base,
      followSystem: override === "system",
      setScheme: (next: "light" | "dark" | "system") => setOverride(next),
      toggleScheme: () => setOverride((prev) => (prev === "dark" ? "light" : prev === "light" ? "dark" : isDark ? "light" : "dark"))
    };
  }, [resolvedScheme, override, isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </View>
  );
}
