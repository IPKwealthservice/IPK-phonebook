import { Text as RNText, StyleSheet, TextProps as RNTextProps } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";

type TextSize = "sm" | "md" | "lg" | "xl";
type Tone = "default" | "muted" | "primary";

type Props = RNTextProps & {
  size?: TextSize;
  weight?: "regular" | "medium" | "semibold" | "bold";
  tone?: Tone;
};

const weightMap = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700"
} as const;

export const Text = ({ size = "md", weight = "regular", tone = "default", style, ...rest }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <RNText
      style={[
        styles.base,
        styles[size],
        { color: tone === "default" ? theme.colors.text : theme.colors[tone] },
        { fontWeight: weightMap[weight] },
        style
      ]}
      {...rest}
    />
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: {
      fontFamily: "System"
    },
    sm: { fontSize: theme.fontSizes.sm },
    md: { fontSize: theme.fontSizes.md },
    lg: { fontSize: theme.fontSizes.lg },
    xl: { fontSize: theme.fontSizes.xl }
  });