import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/core/theme/ThemeProvider";

export const ExploreScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Card>
        <Text size="lg" weight="semibold">
          Expand your workspace
        </Text>
        <Text tone="muted" style={styles.body}>
          Connect telephony, WhatsApp, and other channels to consolidate every lead conversation
          inside IPK PhoneBook.
        </Text>
        <Button label="Settings" onPress={() => router.push("/settings")} />
      </Card>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg
    },
    body: {
      marginVertical: theme.spacing.md
    }
  });