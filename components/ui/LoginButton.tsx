import React from "react";
import { StyleSheet, ViewStyle } from "react-native";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/core/theme/ThemeProvider";

type Props = {
  label?: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  loadingText?: string;
};

export const LoginButton: React.FC<Props> = ({
  label = "Login",
  onPress,
  loading,
  disabled,
  style,
  loadingText,
}) => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Button
      label={label}
      onPress={onPress}
      loading={loading}
      loadingText={loadingText}
      disabled={disabled}
      style={[styles.base, style]}
      textStyle={styles.text}
      accessibilityLabel="Login"
    />
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: {
      alignSelf: "center",
      backgroundColor: "#2563EB", // blue
      borderColor: "#1D4ED8",
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 28,
      minWidth: 220,
      borderRadius: 14,
    },
    text: {
      // Light mode: black text; Dark mode: white text
      color: theme.scheme === "dark" ? "#FFFFFF" : "#111827",
      fontWeight: "700",
      fontSize: 16,
      textAlign: "center",
    },
  });

export default LoginButton;
