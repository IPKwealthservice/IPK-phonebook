import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";

export const AppSplash = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Text size="xl" weight="bold">
        IPK PhoneBook
      </Text>
      <Text tone="muted" style={styles.subtitle}>
        Connecting teams to customers.
      </Text>
      <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm
    },
    subtitle: {
      textAlign: "center"
    },
    spinner: {
      marginTop: theme.spacing.md
    }
  });