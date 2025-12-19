import { useQuery } from '@apollo/client/react';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/feedback/LoadingState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { LEADS_QUERY, MY_ASSIGNED_LEADS } from '@/core/graphql/gql/sales_queries';
import { useTheme } from '@/core/theme/ThemeProvider';
import { humanizeEnum } from '@/core/utils/format';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { usePhoneCall } from '@/features/phone/hooks/usePhoneCall';
import LeadDetailSheet from './LeadDetailSheet';

type LeadItem = {
  id: string;
  leadCode?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  clientStage?: string | null;
  stageFilter?: string | null;
  leadSource?: string | null;
  assignedRM?: string | null;
  assignedRmId?: string | null;
  createdAt?: string | null;
};

export function MyLeadsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const isRM = user?.role === 'RM';
  const isSignedIn = Boolean(user);

  const [page] = useState(1);
  const [pageSize] = useState(500);

  const { startCall } = usePhoneCall();

  // Fetch leads if user is signed in
  // Admin sees all leads, others see their assigned leads
  const shouldFetchLeads = isSignedIn;
  
  const { data, loading, refetch } = useQuery(
    isAdmin ? LEADS_QUERY : MY_ASSIGNED_LEADS, 
    {
      variables: isAdmin ? { args: { page, pageSize } } : { page, pageSize },
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip: !shouldFetchLeads, // Skip query if user is not signed in
    }
  );

  const allLeads: LeadItem[] = useMemo(() => {
    if (isAdmin) return data?.leads?.items ?? [];
    return data?.myAssignedLeads?.items ?? [];
  }, [data, isAdmin]);
  const [search, setSearch] = useState('');
  const normalizedQuery = useMemo(() => search.trim(), [search]);
  const normalizedLower = useMemo(() => normalizedQuery.toLowerCase(), [normalizedQuery]);
  const normalizedDigits = useMemo(() => normalizedQuery.replace(/\D/g, ''), [normalizedQuery]);
  const normalizedUpper = useMemo(() => normalizedQuery.toUpperCase(), [normalizedQuery]);
  const leads: LeadItem[] = useMemo(() => {
    if (!normalizedQuery) return allLeads;
    return allLeads.filter((l) => {
      const firstName = (l.firstName ?? '').toLowerCase();
      const lastName = (l.lastName ?? '').toLowerCase();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      const nameHit = (l.name ?? '').toLowerCase().includes(normalizedLower);
      const firstHit = firstName.includes(normalizedLower);
      const lastHit = lastName.includes(normalizedLower);
      const fullHit = fullName.includes(normalizedLower);
      const phoneHit = (l.phone ?? '').replace(/\D/g, '').includes(normalizedDigits);
      const codeHit = (l.leadCode ?? '').toUpperCase().includes(normalizedUpper);
      return nameHit || firstHit || lastHit || fullHit || phoneHit || codeHit;
    });
  }, [allLeads, normalizedQuery, normalizedLower, normalizedDigits, normalizedUpper]);
  const agingDays = (iso?: string | null) => {
    if (!iso) return '—';
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${days}d`;
  };

  // detail sheet
  const [detailId, setDetailId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const openLead = (id: string) => {
    console.log('MyLeadsScreen: Opening lead with ID:', id);
    setDetailId(id);
    setVisible(true);
  };

  const closeLead = () => {
    setVisible(false);
    setTimeout(() => setDetailId(null), 300);
  };

  const placeCall = async (lead: LeadItem) => {
    if (!lead.phone) return;
    const derivedName = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
    // Use explicit fallback chain - wrap entire right side in parentheses to avoid precedence issues
    const leadName = lead.name ?? (derivedName || lead.leadCode || undefined);
    await startCall({
      leadId: lead.id,
      leadName,
      phone: lead.phone,
      clientStage: lead.clientStage ?? null,
      stageFilter: lead.stageFilter ?? null,
    });
  };

  // Show login prompt for users who aren't signed in
  // RM users can access the app without login, but won't see leads until they sign in
  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.containerCenter}>
          <Text weight="semibold" size="lg" style={{ marginBottom: theme.spacing.md }}>
            My Leads
          </Text>
          <Text tone="muted" size="sm" style={{ textAlign: 'center', paddingHorizontal: theme.spacing.lg }}>
            Please sign in to view your assigned leads. Login is optional for RM users.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (loading && !leads.length && shouldFetchLeads) {
    return (
      <View style={styles.containerCenter}>
        <LoadingState message="Retrieving your data..." />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={leads}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refetch()} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.headerArea}>
            <Text weight="semibold" size="lg">{isAdmin ? 'All leads' : 'My leads'}</Text>
            <Text tone="muted" size="sm">
              {isAdmin ? 'Admin scope: viewing every lead and RM assignment.' : 'Showing only leads assigned to you.'}
            </Text>
            <Text tone="muted" size="sm">Search by lead code, name, or phone</Text>
            <View style={styles.searchWrap}>
              <TextInput
                placeholder="Search lead code, name, or phone"
                placeholderTextColor={theme.colors.muted}
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => openLead(item.id)}>
            <Card style={styles.leadCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.stageLabel}>
                  <Text size="xs" weight="semibold">{humanizeEnum(item.clientStage ?? 'NEW_LEAD')}</Text>
                </View>
                <Text size="xs" tone="muted">{agingDays(item.createdAt)}</Text>
              </View>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text weight="bold" style={{ color: theme.colors.primary }}>
                    {String(item.firstName || item.lastName || item.leadCode || 'Lead').charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {/* Lead Code - prominently displayed */}
                  {item.leadCode ? (
                    <Text weight="bold" size="sm" style={{ color: theme.colors.primary }}>
                      {item.leadCode}
                    </Text>
                  ) : null}
                  
                  {/* First Name and Last Name */}
                  <Text weight="semibold" size="md">
                    {[item.firstName, item.lastName].filter(Boolean).join(' ') || item.name || 'Unnamed'}
                  </Text>
                  
                  {/* Phone Number - prominently displayed */}
                  {item.phone ? (
                    <Text size="sm" weight="medium" style={{ color: theme.colors.text }}>
                      {item.phone}
                    </Text>
                  ) : (
                    <Text size="sm" tone="muted">No phone number</Text>
                  )}
                  
                  {/* RM assignment - shown ONLY for Admin */}
                  {isAdmin && (
                    <Text size="xs" tone="muted" weight="medium">
                      RM: {item.assignedRM ?? 'Unassigned'}
                    </Text>
                  )}
                </View>
                <Pressable
                  style={styles.callButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    placeCall(item);
                  }}
                >
                  <Text weight="bold" size="sm" style={{ color: '#fff' }}>Call</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={(
          <View style={{ padding: 24, alignItems: 'center' }}>
            {loading && shouldFetchLeads ? (
              <LoadingState message="Loading, please wait..." />
            ) : (
              <Text tone="muted">
                {isAdmin ? 'No leads found.' : 'No assigned leads.'}
              </Text>
            )}
          </View>
        )}
      />

      <LeadDetailSheet leadId={detailId} visible={visible} onClose={closeLead} />
    </SafeAreaView>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    containerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    headerArea: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    searchWrap: { marginTop: theme.spacing.sm },
    searchInput: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      color: theme.colors.text,
    },
    stageChips: {
      paddingVertical: theme.spacing.md,
      paddingRight: theme.spacing.lg,
      gap: 10,
    },
    stagePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.card,
      marginLeft: theme.spacing.xs,
    },
    stageCount: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 6,
    },
    list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.md },
    leadCard: { padding: theme.spacing.md, gap: theme.spacing.sm },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stageLabel: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: 'rgba(70,95,255,0.12)',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(70,95,255,0.15)',
    },
    callButton: {
      backgroundColor: theme.colors.success,
      borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    },
  });

export default MyLeadsScreen;
