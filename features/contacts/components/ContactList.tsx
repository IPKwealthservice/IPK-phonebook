import { FlatList, ListRenderItem, StyleSheet, View } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Contact } from "@/features/contacts/types";
import { ContactCard } from "@/features/contacts/components/ContactCard";
import { Text } from "@/components/ui/Text";

type Props = {
  contacts: Contact[];
};

export const ContactList = ({ contacts }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const renderItem: ListRenderItem<Contact> = ({ item }) => <ContactCard contact={item} />;

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={() => (
        <Text size="lg" weight="semibold" style={styles.heading}>
          Contacts ({contacts.length})
        </Text>
      )}
    />
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md
    },
    separator: {
      height: theme.spacing.md
    },
    heading: {
      marginBottom: theme.spacing.md
    }
  });