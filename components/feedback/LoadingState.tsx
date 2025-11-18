import React from "react";
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/core/theme/ThemeProvider";

type Props = {
  message?: string;
  style?: StyleProp<ViewStyle>;
};

export const LoadingState: React.FC<Props> = ({
  message = "Loading, please wait…",
  style,
}) => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.container, style]} accessibilityRole="status" accessibilityLabel={message}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text tone="muted">{message}</Text>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
  });

export default LoadingState;

