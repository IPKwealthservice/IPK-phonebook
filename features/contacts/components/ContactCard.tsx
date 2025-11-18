import { Image, StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/core/theme/ThemeProvider";
import { Contact } from "@/features/contacts/types";
import { useContactActions } from "@/features/contacts/hooks/useContactActions";
import { formatPhone } from "@/core/utils/format";

type Props = {
  contact: Contact;
};

export const ContactCard = ({ contact }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { dial, email } = useContactActions();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {contact.avatarUri ? (
          <Image source={{ uri: contact.avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder]}>
            <Text weight="bold" size="lg">
              {contact.displayName.charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text weight="semibold">{contact.displayName}</Text>
          <Text tone="muted" size="sm">
            {formatPhone(contact.phone)}
          </Text>
          <Text tone="muted" size="sm">
            {contact.email ?? "No email"}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Call" onPress={() => dial(contact)} style={styles.actionButton} />
        <Button label="Email" onPress={() => email(contact)} style={styles.actionButton} />
      </View>
    </Card>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.md
    },
    header: {
      flexDirection: "row",
      gap: theme.spacing.md,
      alignItems: "center"
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: theme.radii.lg,
      alignItems: "center",
      justifyContent: "center"
    },
    placeholder: {
      backgroundColor: theme.colors.border
    },
    info: {
      flex: 1,
      gap: theme.spacing.xs
    },
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    actionButton: {
      flex: 1
    }
  });