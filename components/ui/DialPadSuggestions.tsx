import { Contact } from "@/features/contacts/types";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, StyleProp } from "react-native";

type DialPadSuggestionsProps = {
  suggestions: Contact[];
  onSelect: (contact: Contact) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const DialPadSuggestions: React.FC<DialPadSuggestionsProps> = ({
  suggestions,
  onSelect,
  style,
  compact,
}) => {
  if (!suggestions.length) return null;

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <Text style={styles.sectionLabel}>Suggested contacts</Text>
      {suggestions.map((contact) => {
        const initials = contact.displayName
          ?.split(" ")
          .map((chunk) => chunk.charAt(0))
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <TouchableOpacity
            key={contact.id}
            style={[styles.card, compact && styles.cardCompact]}
            activeOpacity={0.85}
            onPress={() => onSelect(contact)}
          >
            <View style={[styles.avatar, compact && styles.avatarCompact]}>
              <Text style={[styles.avatarLabel, compact && styles.avatarLabelCompact]}>{initials || "?"}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{contact.displayName}</Text>
              {!!contact.phone && (
                <Text style={styles.phone} numberOfLines={1}>
                  {contact.phone}
                </Text>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 16,
    gap: 10,
  },
  containerCompact: {
    padding: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6B7280",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
  },
  cardCompact: {
    paddingVertical: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4338CA",
  },
  avatarLabelCompact: {
    fontSize: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  phone: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },
});

export default DialPadSuggestions;
