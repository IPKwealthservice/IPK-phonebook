import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/core/theme/ThemeProvider";

export default function ModalRoute() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Modal", presentation: "modal" }} />
      <Text size="lg" weight="semibold">
        Placeholder modal
      </Text>
      <Text tone="muted">Use this space for quick CRM actions or notes.</Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm
    }
  });