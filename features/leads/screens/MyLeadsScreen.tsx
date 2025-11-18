import { useQuery } from '@apollo/client/react';
import React, { useMemo, useState } from 'react';
import { Linking, FlatList, Pressable, RefreshControl, StyleSheet, View , TextInput } from 'react-native';

import { LoadingState } from '@/components/feedback/LoadingState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { MY_ASSIGNED_LEADS } from '@/core/graphql/queries';
import { useTheme } from '@/core/theme/ThemeProvider';
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
  const [search, setSearch] = useState('');
  const normalizedQuery = useMemo(() => search.trim(), [search]);
  const normalizedDigits = useMemo(() => normalizedQuery.replace(/\\D/g, ''), [normalizedQuery]);
  const normalizedUpper = useMemo(() => normalizedQuery.toUpperCase(), [normalizedQuery]);
  const leads: LeadItem[] = useMemo(() => {
    if (!normalizedQuery) return allLeads;
    return allLeads.filter((l) => {
      const nameHit = (l.name ?? '').toLowerCase().includes(normalizedQuery.toLowerCase());
      const phoneHit = (l.phone ?? '').replace(/\\D/g, '').includes(normalizedDigits);
      const codeHit = (l.leadCode ?? '').toUpperCase().includes(normalizedUpper);
      return nameHit || phoneHit || codeHit;
    });
  }, [allLeads, normalizedQuery, normalizedDigits, normalizedUpper]);

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
        <LoadingState message="Retrieving your data…" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search lead code, name, or phone"
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>
      <FlatList
        data={leads}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refetch()} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => openLead(item.id)}>
            <Card style={styles.leadCard}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text weight="bold" style={{ color: theme.colors.primary }}>
                    {String(item.name || 'Lead').charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
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
            {loading ? <LoadingState message="Loading, please wait…" /> : <Text tone="muted">No assigned leads.</Text>}
          </View>
        )}
      />

      <LeadDetailSheet leadId={detailId} visible={visible} onClose={() => setVisible(false)} />
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    containerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
    searchWrap: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg },
    searchInput: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      color: theme.colors.text,
    },
    list: { padding: theme.spacing.lg, gap: theme.spacing.md },
    leadCard: { padding: theme.spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(70,95,255,0.15)',
    },
    callButton: {
      backgroundColor: theme.colors.success,
      borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    },
  });

export default MyLeadsScreen;








