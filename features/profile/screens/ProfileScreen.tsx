import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useAuthStore } from '@/features/auth/store/auth.store';

export const ProfileScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const name = user?.name ?? 'No Name';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}> 
      {/* Top header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}> 
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text weight="semibold" style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {/* Placeholder avatar; replace with Image when available */}
            <MaterialIcons name="person" size={48} color="#FFFFFF" />
          </View>
          <Text weight="semibold" style={{ color: theme.colors.primary, marginTop: 8 }}>{name}</Text>
        </View>

        <Card style={styles.card}>
          <InfoField label="Name" value={user?.name ?? '-'} />
          <InfoField label="Email" value={user?.email ?? '-'} />
          <InfoField label="Phone" value={user?.phone ?? '-'} />
          <InfoField label="Department" value={user?.department ?? '-'} />
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
  avatarWrap: { alignItems: 'center', marginTop: -36 },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff'
  },
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