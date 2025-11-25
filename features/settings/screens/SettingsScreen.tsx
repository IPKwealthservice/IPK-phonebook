import { StyleSheet, View } from "react-native";
import Constants from "expo-constants";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAppearance } from "@/features/settings/hooks/useAppearance";
import { storageClear } from "@/core/storage/storage";
import { toast } from "@/components/feedback/Toast";

export const SettingsScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const appearance = useAppearance();

  const clearData = async () => {
    await storageClear();
    toast("Local storage cleared");
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text size="lg" weight="semibold">
          Appearance
        </Text>
        <Text tone="muted">Current theme: {appearance.scheme}</Text>
        <ThemeToggle />
        <View style={[styles.preview, { backgroundColor: appearance.colors.card }]}>
          <Text>Headline</Text>
          <Text tone="muted">Muted example</Text>
          <Button label="Primary" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <Text size="lg" weight="semibold">
          About
        </Text>
        <Text tone="muted">Version {Constants.expoConfig?.version ?? "1.0.0"}</Text>
      </View>

      <View style={styles.section}>
        <Text size="lg" weight="semibold">
          Maintenance
        </Text>
        <Button label="Clear local data" onPress={clearData} />
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg
    },
    section: {
      gap: theme.spacing.sm
    },
    preview: {
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    }
  });
