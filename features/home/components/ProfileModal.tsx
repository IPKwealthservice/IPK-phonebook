import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { memo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { toast } from "@/components/feedback/Toast";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/core/theme/ThemeProvider";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { AuthUser } from "@/features/auth/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  user?: AuthUser;
};

export const ProfileModal = memo(function ProfileModal({ visible, onClose, user }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleChangePhoto = () => {
    toast("Photo upload coming soon");
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/(auth)/sign-in");
      onClose();
      toast("Signed out");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <Card style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View style={styles.avatarWrapper}>
                <Pressable
                  onPress={handleChangePhoto}
                  style={styles.avatarButton}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="person" size={40} color={theme.colors.primary} />
                  <View style={styles.cameraBadge}>
                    <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
              <View style={styles.identity}>
                <Text size="lg" weight="bold">
                  {user.name}
                </Text>
                <Text tone="muted" size="sm">
                  {user.role}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button">
                <MaterialIcons name="close" size={22} color={theme.colors.muted} />
              </Pressable>
            </View>

            <View style={styles.infoList}>
              <InfoRow label="Email" value={user.email} icon="mail-outline" />
              <InfoRow label="Mobile" value={user.phone} icon="phone" />
              <InfoRow label="Gender" value={user.gender} icon="person-outline" />
              <InfoRow label="Role" value={user.role} icon="work-outline" />
            </View>

            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
              accessibilityRole="button"
            >
              <MaterialIcons name="logout" size={17} color="#FFFFFF" />
              <Text size="sm" weight="semibold" style={styles.logoutLabel}>
                Logout
              </Text>
            </Pressable>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
});

type InfoRowProps = {
  label: string;
  value?: string | undefined;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const InfoRow = ({ label, value, icon }: InfoRowProps) => {
  const theme = useTheme();
  const styles = infoStyles(theme);

  return (
    <View style={styles.row}>
      <View style={styles.iconWrapper}>
        <MaterialIcons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text size="sm" tone="muted">
          {label}
        </Text>
        <Text weight="medium">{value ?? "-"}</Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(16, 24, 40, 0.45)",
      padding: theme.spacing.lg
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject
    },
    sheet: {
      width: "100%",
      maxWidth: 420,
      padding: 0,
      borderRadius: theme.radii.lg,
      // Web tailwind-style box-border behavior
      // (ignored on native platforms, safe to include)
      boxSizing: "border-box" as any,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
      boxSizing: "border-box" as any
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.sm
    },
    avatarWrapper: {
      position: "relative"
    },
    avatarButton: {
      height: 72,
      width: 72,
      borderRadius: 36,
      backgroundColor: "rgba(70, 95, 255, 0.12)",
      alignItems: "center",
      justifyContent: "center"
    },
    cameraBadge: {
      position: "absolute",
      bottom: 4,
      right: 4,
      height: 24,
      width: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.colors.card
    },
    identity: {
      flex: 1,
      gap: 4
    },
    closeButton: {
      height: 36,
      width: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background
    },
    infoList: {
      gap: theme.spacing.sm
    },
    logoutButton: {
      alignSelf: "flex-end",
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.error,
      paddingHorizontal: theme.spacing.md * 1.01,
      paddingVertical: theme.spacing.xs * 1.01,
      borderRadius: theme.radii.sm,
      boxSizing: "border-box" as any
    },
    logoutLabel: {
      color: "#FFFFFF"
    }
  });

const infoStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      boxSizing: "border-box" as any
    },
    iconWrapper: {
      height: 32,
      width: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(70, 95, 255, 0.1)"
    },
    copy: {
      flex: 1,
      gap: 4
    }
  });
