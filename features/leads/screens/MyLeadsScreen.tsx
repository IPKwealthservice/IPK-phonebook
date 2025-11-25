import { useQuery } from '@apollo/client/react';
import React, { useMemo, useState } from 'react';
import { Linking, FlatList, Pressable, RefreshControl, StyleSheet, View, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/feedback/LoadingState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { MY_ASSIGNED_LEADS } from '@/core/graphql/queries';
import { useTheme } from '@/core/theme/ThemeProvider';
import { humanizeEnum } from '@/core/utils/format';
import LeadDetailSheet from './LeadDetailSheet';

type LeadItem = {
  id: string;
  leadCode?: string | null;
  name?: string | null;
  phone?: string | null;
  clientStage?: string | null;
  leadSource?: string | null;
  assignedRM?: string | null;
  assignedRmId?: string | null;
  createdAt?: string | null;
};

export function MyLeadsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [page] = useState(1);
  const [pageSize] = useState(500);

  const { data, loading, refetch } = useQuery(MY_ASSIGNED_LEADS, {
    variables: { page, pageSize },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const allLeads: LeadItem[] = useMemo(() => data?.myAssignedLeads?.items ?? [], [data]);
  const stageOrder = [
    'NEW_LEAD',
    'FIRST_TALK_DONE',
    'FOLLOWING_UP',
    'CLIENT_INTERESTED',
    'ACCOUNT_OPENED',
    'NO_RESPONSE_DORMANT',
    'NOT_INTERESTED_DORMANT',
    'RISKY_CLIENT_DORMANT',
    'HIBERNATED',
  ];
  const stageFilters = ['ALL', ...stageOrder];
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const normalizedQuery = useMemo(() => search.trim(), [search]);
  const normalizedDigits = useMemo(() => normalizedQuery.replace(/\D/g, ''), [normalizedQuery]);
  const normalizedUpper = useMemo(() => normalizedQuery.toUpperCase(), [normalizedQuery]);
  const leads: LeadItem[] = useMemo(() => {
    if (!normalizedQuery) return allLeads;
    return allLeads.filter((l) => {
      const nameHit = (l.name ?? '').toLowerCase().includes(normalizedQuery.toLowerCase());
      const phoneHit = (l.phone ?? '').replace(/\D/g, '').includes(normalizedDigits);
      const codeHit = (l.leadCode ?? '').toUpperCase().includes(normalizedUpper);
      return nameHit || phoneHit || codeHit;
    });
  }, [allLeads, normalizedQuery, normalizedDigits, normalizedUpper]);
  const groupedByStage = useMemo(() => {
    const map = new Map<string, LeadItem[]>();
    for (const lead of leads) {
      const key = String(lead.clientStage ?? 'NEW_LEAD');
      const arr = map.get(key) ?? [];
      arr.push(lead);
      map.set(key, arr);
    }
    return map;
  }, [leads]);
  const filteredByStage = useMemo(() => {
    if (selectedStage === 'ALL') return leads;
    return leads.filter((l) => (l.clientStage ?? 'NEW_LEAD') === selectedStage);
  }, [leads, selectedStage]);
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
    setDetailId(id);
    setVisible(true);
  };

  const placeCall = async (phone?: string | null) => {
    if (!phone) return;
    const normalized = phone.replace(/\s|[-()]/g, '');
    const url = `tel:${normalized}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {}
  };

  if (loading && !leads.length) {
    return (
      <View style={styles.containerCenter}>
        <LoadingState message="Retrieving your data..." />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredByStage}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refetch()} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.headerArea}>
            <Text weight="semibold" size="lg">All leads</Text>
            <Text tone="muted" size="sm">Stage-wise view with quick filters</Text>
            <View style={styles.searchWrap}>
              <TextInput
                placeholder="Search lead code, name, or phone"
                placeholderTextColor={theme.colors.muted}
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stageChips}
            >
              {stageFilters.map((stage) => {
                const active = selectedStage === stage;
                const count = stage === 'ALL'
                  ? leads.length
                  : groupedByStage.get(stage)?.length ?? 0;
                return (
                  <Pressable
                    key={stage}
                    onPress={() => setSelectedStage(stage)}
                    style={[
                      styles.stagePill,
                      active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      size="sm"
                      weight={active ? 'bold' : 'medium'}
                      style={{ color: active ? '#fff' : theme.colors.text }}
                    >
                      {stage === 'ALL' ? 'All stages' : humanizeEnum(stage)}
                    </Text>
                    <View style={[
                      styles.stageCount,
                      active && { backgroundColor: 'rgba(255,255,255,0.18)' },
                    ]}>
                      <Text size="xs" weight="bold" style={{ color: active ? '#fff' : theme.colors.text }}>
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
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
                    {String(item.name || 'Lead').charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold">{item.name ?? 'Unnamed'}</Text>
                  {item.phone ? <Text size="sm" tone="muted">{item.phone}</Text> : null}
                  <Text size="sm" tone="muted">{item.leadSource ?? item.clientStage ?? ''}</Text>
                </View>
                <Pressable style={styles.callButton} onPress={() => placeCall(item.phone)}>
                  <Text weight="bold" size="sm" style={{ color: '#fff' }}>Call</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={(
          <View style={{ padding: 24, alignItems: 'center' }}>
            {loading ? <LoadingState message="Loading, please wait..." /> : <Text tone="muted">No assigned leads.</Text>}
          </View>
        )}
      />

      <LeadDetailSheet leadId={detailId} visible={visible} onClose={() => setVisible(false)} />
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
