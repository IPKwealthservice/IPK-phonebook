import { useQuery } from '@apollo/client/react';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { LoadingState } from '@/components/feedback/LoadingState';
import { LEADS_BY_STAGE_QUERY, STAGE_SUMMARY_QUERY } from '@/core/graphql/queries';
import { useTheme } from '@/core/theme/ThemeProvider';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { usePhoneCall } from '@/features/phone/hooks/usePhoneCall';
import LeadDetailSheet from './LeadDetailSheet';

type StageKey =
  | 'ACCOUNT_OPENED'
  | 'CLIENT_INTERESTED'
  | 'FIRST_TALK_DONE'
  | 'FOLLOWING_UP'
  | 'HIBERNATED'
  | 'NEW_LEAD'
  | 'NOT_INTERESTED_DORMANT'
  | 'NO_RESPONSE_DORMANT'
  | 'RISKY_CLIENT_DORMANT';

type LeadItem = {
  id: string;
  name?: string | null;
  phone: string;
  clientStage?: StageKey | null;
  stageFilter?: string | null;
  status: string;
  leadSource?: string | null;
  assignedRM?: string | null;
  assignedRmId?: string | null;
};

const slugToLabel = (stage?: StageKey | null) =>
  (stage ?? 'NEW_LEAD')
    .split('_')
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(' ');

export function StageLeadsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const user = useAuthStore((s) => s.user);
  const [selectedStage, setSelectedStage] = useState<StageKey>('NEW_LEAD');

  // detail sheet state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: stageData, loading: summaryLoading, refetch: refetchSummary } = useQuery(STAGE_SUMMARY_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const leadArgs = useMemo(() => {
    const args: Record<string, any> = { page: 1, pageSize: 20 };
    if (user?.role === 'RM' && user?.id) {
      args.assignedRmId = user.id;
    }
    return args;
  }, [user?.role, user?.id]);

  const { data: leadsData, loading: leadsLoading, refetch: refetchLeads } = useQuery(
    LEADS_BY_STAGE_QUERY,
    {
      variables: { stage: selectedStage, args: leadArgs },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'cache-and-network',
    }
  );

  // Pull-to-refresh both summary and current leads
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSummary(), refetchLeads()]);
    } finally {
      setRefreshing(false);
    }
  };

  const stages: { key: StageKey; count: number }[] = useMemo(() => {
    const items: { stage: StageKey; count: number }[] =
      stageData?.leadStageSummary?.items ?? [];
    if (!items.length) {
      return [
        'NEW_LEAD',
        'FIRST_TALK_DONE',
        'FOLLOWING_UP',
        'CLIENT_INTERESTED',
        'ACCOUNT_OPENED',
        'NO_RESPONSE_DORMANT',
        'NOT_INTERESTED_DORMANT',
        'RISKY_CLIENT_DORMANT',
        'HIBERNATED',
      ].map((k) => ({ key: k as StageKey, count: 0 }));
    }
    return items.map((it: any) => ({ key: it.stage as StageKey, count: it.count as number }));
  }, [stageData]);

  const leads: LeadItem[] = useMemo(() => {
    return (leadsData?.leadsByStage?.items ?? []).slice();
  }, [leadsData]);

  const { startCall } = usePhoneCall();

  const placeCall = async (lead: LeadItem) => {
    if (!lead.phone) return;
    try {
      await startCall({
        leadId: lead.id,
        leadName: lead.name ?? undefined,
        phone: lead.phone,
        clientStage: lead.clientStage ?? null,
        stageFilter: lead.stageFilter ?? null,
      });
    } catch (err) {
      console.error('Failed to start call', err);
    }
  };

  const openLead = (id: string) => {
    setDetailId(id);
    setSheetVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text size="lg" weight="bold">Leads by Stage</Text>
          <Text tone="muted" size="sm">
            Role: {user?.role ?? 'Unknown'} {user?.role === 'RM' ? '(My assigned leads)' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={stages}
        keyExtractor={(it) => it.key}
        contentContainerStyle={styles.stageRow}
        renderItem={({ item }) => {
          const active = item.key === selectedStage;
          return (
            <Pressable onPress={() => setSelectedStage(item.key)} style={[styles.stagePill, active && styles.stagePillActive]}>
              <Text size="sm" weight={active ? 'semibold' : 'medium'} tone={active ? 'primary' : 'default'}>
                {slugToLabel(item.key)}
              </Text>
              <View style={styles.countBadge}>
                <Text size="sm" weight="bold" style={{ color: theme.colors.primary }}>{item.count}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={summaryLoading ? (
          <LoadingState style={{ paddingVertical: 12 }} message="Loading, please wait…" />
        ) : null}
      />

      <FlatList
        data={leads}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => openLead(item.id)}>
            <Card style={styles.leadCard}>
              <View style={styles.leadRow}>
                <View style={styles.leadAvatar}>
                  <MaterialIcons name="person" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.leadMeta}>
                  <Text weight="semibold">{item.name ?? 'Unnamed'}</Text>
                  <Text size="sm" tone="muted">{item.phone}</Text>
                  <Text size="sm" tone="muted">{item.leadSource ?? slugToLabel(item.clientStage ?? null)}</Text>
                </View>
                <Pressable 
                  style={styles.callButton} 
                  onPress={(e) => {
                    e.stopPropagation();
                    placeCall(item);
                  }}
                >
                  <MaterialIcons name="call" size={18} color="#fff" />
                  <Text weight="bold" size="sm" style={{ color: '#fff', marginLeft: 6 }}>Call</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={(
          <View style={{ padding: 24, alignItems: 'center' }}>
            {leadsLoading ? (
              <LoadingState message="Retrieving your data…" />
            ) : (
              <Text tone="muted">No leads found for this stage.</Text>
            )}
          </View>
        )}
      />

      {/* Detail bottom sheet */}
      <LeadDetailSheet
        leadId={detailId}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    stageRow: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: 8,
    },
    stagePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 18,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginRight: 8,
    },
    stagePillActive: { borderColor: theme.colors.primary },
    countBadge: {
      marginLeft: 8,
      borderRadius: 10,
      backgroundColor: 'rgba(70,95,255,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    list: { padding: theme.spacing.lg, gap: theme.spacing.md },
    leadCard: { padding: theme.spacing.md },
    leadRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    leadAvatar: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(70,95,255,0.15)',
    },
    leadMeta: { flex: 1 },
    callButton: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.success,
      borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    },
  });

export default StageLeadsScreen;
