import { StyleSheet, View } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Contact } from "@/features/contacts/types";
import { formatPhone } from "@/core/utils/format";

type Props = {
  contact: Contact;
};

export const ContactDetailScreen = ({ contact }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Card>
        <Text size="xl" weight="bold">
          {contact.displayName}
        </Text>
        <View style={styles.block}>
          <Text tone="muted">Phone</Text>
          <Text>{formatPhone(contact.phone)}</Text>
        </View>
        <View style={styles.block}>
          <Text tone="muted">Email</Text>
          <Text>{contact.email ?? "No email"}</Text>
        </View>
      </Card>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background
    },
    block: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.xs
    }
  });