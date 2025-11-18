import { useTheme } from "@/core/theme/ThemeProvider";

export const useAppearance = () => {
  const theme = useTheme();
  return {
    scheme: theme.scheme,
    colors: theme.colors,
    isDark: theme.scheme === "dark",
    followSystem: theme.followSystem ?? true,
    toggle: theme.toggleScheme ?? (() => {}),
    setScheme: theme.setScheme ?? (() => {})
  };
};
