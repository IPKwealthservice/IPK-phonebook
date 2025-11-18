import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useContactsStore } from "@/features/contacts/store/contacts.store";

export const ContactsOverviewScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const count = useContactsStore((state) => state.list.length);

  return (
    <View style={styles.container}>
      <Card>
        <Text size="xl" weight="bold">
          Welcome back 👋
        </Text>
        <Text tone="muted" style={styles.body}>
          Track conversations, follow-ups, and recent CRM activity in one place.
        </Text>
        <Card style={styles.statCard}>
          <Text tone="muted">Synced contacts</Text>
          <Text size="xl" weight="bold">
            {count}
          </Text>
        </Card>
        <Button label="Open Contacts" onPress={() => router.push("/(tabs)/contacts") } />
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
    },
    statCard: {
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background
    }
  });