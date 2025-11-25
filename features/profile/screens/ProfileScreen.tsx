import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useAuthStore } from '@/features/auth/store/auth.store';

const getInitials = (value?: string | null) => {
  if (!value) return 'IPK';
  const parts = value.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
  return `${first}${last}`.toUpperCase() || 'IPK';
};

const humanizeRole = (role?: string | null) => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'MARKETING':
      return 'Marketing';
    case 'RM':
      return 'Relationship Manager';
    case 'STAFF':
      return 'Staff';
    default:
      return role ?? '—';
  }
};

export const ProfileScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const name = user?.name ?? 'No Name';
  const initials = useMemo(() => getInitials(name), [name]);
  const roleLabel = humanizeRole(user?.role);
  const department = user?.department ?? 'N/A';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}> 
      {/* Top header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}> 
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text weight="semibold" style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarHalo}>
              <View style={styles.avatarCircle}>
                <Text weight="bold" style={{ color: theme.colors.text }}>{initials}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text weight="semibold" size="lg">{name}</Text>
              <Text tone="muted" size="sm">{user?.email ?? '—'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text size="xs" weight="bold" style={styles.badgeText}>{roleLabel}</Text>
                </View>
                <View style={styles.badgeMuted}>
                  <Text size="xs" weight="semibold" style={styles.badgeMutedText}>{department}</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <InfoField label="Name" value={user?.name ?? '-'} />
          <InfoField label="Email" value={user?.email ?? '-'} />
          <InfoField label="Phone" value={user?.phone ?? '-'} />
          <InfoField label="Department" value={department} />
          <InfoField label="Role" value={roleLabel} />
          <InfoField label="Gender" value={(user as any)?.gender ?? '-'} />
        </Card>

        <Pressable accessibilityRole="button" onPress={async () => { await signOut(); router.replace('/(auth)/sign-in'); }} style={styles.logoutBtn}>
          <MaterialIcons name="logout" size={18} color="#fff" />
          <Text weight="semibold" style={{ color: '#fff', marginLeft: 8 }}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoField = ({ label, value }: { label: string; value?: string | null }) => {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text size="sm" tone="muted">{label}</Text>
      <View style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radii.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
      }}>
        <Text>{value ?? '-'}</Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    height: 120,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: { color: '#fff', fontSize: 18 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  identityCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.scheme === 'dark' ? '#0F172A' : '#F8FAFF',
  },
  avatarWrap: { alignItems: 'center', gap: theme.spacing.sm },
  avatarHalo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(70,95,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 2, borderColor: theme.colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  badgeText: { color: '#fff' },
  badgeMuted: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeMutedText: { color: theme.colors.text },
  card: { gap: theme.spacing.md, padding: theme.spacing.md },
  logoutBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
  },
});

export default ProfileScreen;
