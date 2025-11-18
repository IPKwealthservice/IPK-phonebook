import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";

export const Card = ({ children, style, ...rest }: PropsWithChildren<ViewProps>) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.md,
      padding: theme.spacing.lg,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4
    }
  });