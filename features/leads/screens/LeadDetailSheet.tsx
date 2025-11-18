import { useQuery } from '@apollo/client/react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/feedback/LoadingState';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { LEAD_BASIC, LEAD_DETAIL_WITH_TIMELINE } from '@/core/graphql/queries';
import { useTheme } from '@/core/theme/ThemeProvider';
import { updateLeadAfterCall } from '@/features/leads/services/interactions.service';
import { usePhoneCall } from '@/features/phone/hooks/usePhoneCall';
import CallFollowUpModal from '@/features/phone/components/CallFollowUpModal';

type Props = {
  leadId: string | null;
  visible: boolean;
  onClose: () => void;
};

const CLIENT_STAGE_OPTIONS = [
  'NEW_LEAD',
  'FIRST_TALK_DONE',
  'FOLLOWING_UP',
  'CLIENT_INTERESTED',
  'ACCOUNT_OPENED',
  'NO_RESPONSE_DORMANT',
  'NOT_INTERESTED_DORMANT',
  'RISKY_CLIENT_DORMANT',
  'HIBERNATED',
] as const;

type ClientStageOption = (typeof CLIENT_STAGE_OPTIONS)[number];

const STAGE_FILTER_OPTIONS = [
  null,
  'NEED_CLARIFICATION',
  'FUTURE_INTERESTED',
  'NOT_INTERESTED',
  'NOT_ELIGIBLE',
  'HIGH_PRIORITY',
  'LOW_PRIORITY',
  'ON_PROCESS',
] as const;

type StageFilterOption = (typeof STAGE_FILTER_OPTIONS)[number];

export default function LeadDetailSheet({ leadId, visible, onClose }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const { data, loading, refetch, error } = useQuery(LEAD_DETAIL_WITH_TIMELINE, {
    variables: { leadId: leadId!, eventsLimit: 30 },
    skip: !leadId,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    returnPartialData: true,
    notifyOnNetworkStatusChange: true,
  });

  // Fallback: if detail-with-timeline is not available on backend, try minimal lead() query
  const {
    data: basicData,
    loading: basicLoading,
    refetch: refetchBasic,
    error: basicError,
  } = useQuery(LEAD_BASIC, {
    variables: { id: leadId! },
    skip: !leadId,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    returnPartialData: true,
    notifyOnNetworkStatusChange: true,
  });

  // When the sheet becomes visible, force a refetch if we don't have data yet
  React.useEffect(() => {
    if (visible && leadId) {
      if (!data) refetch().catch(() => {});
      if (!basicData) refetchBasic().catch(() => {});
    }
  }, [visible, leadId]);

  React.useEffect(() => {
    if (!lead) return;
    if (lead.clientStage && (CLIENT_STAGE_OPTIONS as readonly string[]).includes(lead.clientStage)) {
      setSelectedStage(lead.clientStage as ClientStageOption);
    } else {
      setSelectedStage('NEW_LEAD');
    }

    const nextFilter = (lead.stageFilter ?? null) as StageFilterOption;
    if (nextFilter === null || (STAGE_FILTER_OPTIONS as readonly (string | null)[]).includes(nextFilter)) {
      setSelectedStageFilter(nextFilter);
    } else {
      setSelectedStageFilter(null);
    }
  }, [lead?.id, lead?.clientStage, lead?.stageFilter]);

  // When follow-up modal opens, also open the log modal for stage updates
  React.useEffect(() => {
    if (isFollowUpOpen && callDurationSeconds) {
      setChannel('CALL');
      setCallEndedAt(new Date().toISOString());
      // Don't auto-open log modal, let CallFollowUpModal handle it first
      // User can manually open log modal if needed for stage changes
    }
  }, [isFollowUpOpen, callDurationSeconds]);

  const lead = data?.leadDetailWithTimeline ?? basicData?.lead;
  const title = 'Lead identity';

  const {
    startCall,
    isFollowUpOpen,
    callDurationSeconds,
    closeFollowUp,
    activeLead: callActiveLead,
  } = usePhoneCall();
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);
  const [callEndedAt, setCallEndedAt] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<ClientStageOption>('NEW_LEAD');
  const [selectedStageFilter, setSelectedStageFilter] = useState<StageFilterOption>(null);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [stageFilterPickerOpen, setStageFilterPickerOpen] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageFilterSaving, setStageFilterSaving] = useState(false);
  const primaryPhone = useMemo(() => {
    if (!lead?.phones?.length) return lead?.phone;
    const primary = lead.phones.find((p: any) => p.isPrimary) ?? lead.phones[0];
    return primary?.number ?? lead?.phone;
  }, [lead]);

  const openWhatsApp = async (phone?: string | null) => {
    if (!phone) return;
    const normalized = (phone || '').replace(/\s|[-()]/g, '');
    const url = `whatsapp://send?phone=${normalized}`;
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
  };

  const openEmail = async (email?: string | null) => {
    if (!email) return;
    const url = `mailto:${email}`;
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
  };

  const copy = async (value?: string | null) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
  };

  const handleStartCall = useCallback(async () => {
    if (!lead || !primaryPhone) {
      Alert.alert('Dialer', 'No phone number available for this lead.');
      return;
    }
    setChannel('CALL');
    const startedAtIso = new Date().toISOString();
    setCallStartedAt(startedAtIso);
    setCallEndedAt(null);
    try {
      await startCall({
        leadId: lead.id,
        leadName: lead.name ?? undefined,
        phone: primaryPhone,
      });
    } catch (err) {
      console.error('Failed to open dialer', err);
      setCallStartedAt(null);
      Alert.alert('Dialer', 'Failed to open the phone app.');
    }
  }, [lead, primaryPhone, startCall]);

  const openManualLog = useCallback(() => {
    setCallStartedAt(null);
    setCallEndedAt(null);
    setChannel('CALL');
    setLogOpen(true);
  }, []);

  const closeLogModal = useCallback(() => {
    setLogOpen(false);
    setChannel('CALL');
    setNote('');
    setProductExplained(true);
    setNextFollowUpAt(undefined);
    setCallStartedAt(null);
    setCallEndedAt(null);
    closeFollowUp();
  }, [closeFollowUp]);

  const handleStageSelect = useCallback(
    async (value: ClientStageOption) => {
      if (!leadId) return;
      if (selectedStage === value) {
        setStagePickerOpen(false);
        return;
      }
      try {
        setStageSaving(true);
        await updateLeadAfterCall({
          leadId,
          channel: 'OTHER',
          stage: value,
          stageFilter: selectedStageFilter ?? null,
          note: `Stage changed to ${slugToLabel(value)}`,
        });
        setSelectedStage(value);
        setStagePickerOpen(false);
        refetch();
      } catch (err) {
        console.error('Failed to update stage', err);
        Alert.alert('Lead stage', 'Unable to update the stage. Please try again.');
      } finally {
        setStageSaving(false);
      }
    },
    [leadId, refetch, selectedStage, selectedStageFilter]
  );

  const handleStageFilterSelect = useCallback(
    async (value: StageFilterOption) => {
      if (!leadId) return;
      if (selectedStageFilter === value) {
        setStageFilterPickerOpen(false);
        return;
      }
      try {
        setStageFilterSaving(true);
        await updateLeadAfterCall({
          leadId,
          channel: 'OTHER',
          stage: selectedStage,
          stageFilter: value ?? null,
          note:
            value != null
              ? `Stage filter set to ${slugToLabel(value)}`
              : 'Stage filter cleared',
        });
        setSelectedStageFilter(value);
        setStageFilterPickerOpen(false);
        refetch();
      } catch (err) {
        console.error('Failed to update stage filter', err);
        Alert.alert('Lead filter', 'Unable to update the stage filter. Please try again.');
      } finally {
        setStageFilterSaving(false);
      }
    },
    [leadId, refetch, selectedStage, selectedStageFilter]
  );

  // Interaction state
  const [logOpen, setLogOpen] = useState(false);
  const [channel, setChannel] = useState<'CALL' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'OTHER'>('CALL');
  const [note, setNote] = useState('');
  const [productExplained, setProductExplained] = useState(true);
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const submitInteraction = async () => {
    if (!leadId || !note.trim()) return;
    setSaving(true);
    try {
      const endedAt = callEndedAt ?? (callStartedAt ? new Date().toISOString() : null);
      await updateLeadAfterCall({
        leadId: leadId,
        channel,
        note: note.trim(),
        productExplained,
        nextFollowUpAt: nextFollowUpAt ?? null,
        stage: selectedStage,
        stageFilter: selectedStageFilter ?? null,
        callStartedAt,
        callEndedAt: endedAt,
        durationSeconds: callDurationSeconds ?? null,
        saveRemark: true,
      });
      refetch();
      closeLogModal();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text size="lg" weight="bold">{title}</Text>
                {!!lead?.leadCode && (
                  <Text size="sm" tone="muted" style={{ marginTop: 2 }}>{lead.leadCode}</Text>
                )}
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            {(loading || basicLoading) && (
              <LoadingState style={{ paddingVertical: 24 }} message="Retrieving your data..." />
            )}

            {!lead && !(loading || basicLoading) && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                {error || basicError ? (
                  <>
                    <Text tone="muted">Unable to load lead.</Text>
                    <Text size="sm" tone="muted" style={{ marginTop: 6 }}>
                      {String(error?.message ?? basicError?.message ?? '')}
                    </Text>
                  </>
                ) : (
                  <LoadingState style={{ paddingVertical: 8 }} message="Loading..." />
                )}
              </View>
            )}

                {!!lead && (
                  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Quick facts */}
                <Card style={styles.card}>
                  <Text weight="semibold" style={styles.sectionTitle}>Quick info</Text>
                  <Meta line1="Name" line2={lead.name || '-'} />
                  <View style={styles.row}>
                    <MaterialIcons name="phone" size={16} color={theme.colors.primary} />
                    <Text style={styles.rowText}>{primaryPhone || 'Not captured'}</Text>
                    <View style={styles.rowActions}>
                      <Pressable onPress={handleStartCall} style={styles.iconBtn}>
                        <MaterialIcons name="call" size={16} color="#fff" />
                      </Pressable>
                      <Pressable onPress={() => openWhatsApp(primaryPhone)} style={styles.iconBtn}>
                        <MaterialCommunityIcons name="whatsapp" size={16} color="#fff" />
                      </Pressable>
                      <Pressable onPress={() => copy(primaryPhone)} style={[styles.iconBtn, { backgroundColor: theme.colors.muted }]}>
                        <MaterialIcons name="content-copy" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>

                  {lead.email ? (
                    <View style={styles.row}>
                      <MaterialIcons name="email" size={16} color={theme.colors.primary} />
                      <Text style={styles.rowText}>{lead.email}</Text>
                      <View style={styles.rowActions}>
                        <Pressable onPress={() => openEmail(lead.email)} style={styles.iconBtn}>
                          <MaterialIcons name="send" size={16} color="#fff" />
                        </Pressable>
                        <Pressable onPress={() => copy(lead.email)} style={[styles.iconBtn, { backgroundColor: theme.colors.muted }]}>
                          <MaterialIcons name="content-copy" size={14} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  <View style={[styles.row, { marginTop: 6 }]}>
                    <MaterialIcons name="event" size={16} color={theme.colors.primary} />
                    <Text style={styles.rowText}>
                      Entered on: {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                    </Text>
                  </View>
                  <View style={[styles.row, { marginTop: 2 }]}>
                    <MaterialIcons name="hourglass-bottom" size={16} color={theme.colors.primary} />
                    <Text style={styles.rowText}>Aging days: {lead.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000)) : '-'}</Text>
                  </View>
                  <Meta line1="Lead source" line2={lead.leadSource || '-'} />
                  <Meta line1="Gender" line2={lead.gender ? slugToLabel(lead.gender) : '-'} />
                </Card>

                {/* Meta */}
                <Card style={styles.card}>
                  <Text weight="semibold" style={styles.sectionTitle}>Lead details</Text>
                  <Meta line1="Lead code" line2={lead.leadCode || '-'} />
                  <View style={styles.detailGrid}>
                    <View style={styles.detailBox}>
                      <Text size="sm" tone="muted">Stage</Text>
                      <Pressable
                        onPress={() => setStagePickerOpen(true)}
                        style={styles.detailValue}
                        disabled={stageSaving}
                      >
                        <Text weight="semibold">{slugToLabel(selectedStage)}</Text>
                        <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
                      </Pressable>
                      {stageSaving ? (
                        <Text size="xs" tone="muted" style={{ marginTop: 4 }}>Updating...</Text>
                      ) : null}
                    </View>
                    <View style={styles.detailBox}>
                      <Text size="sm" tone="muted">Status filter</Text>
                      <Pressable
                        onPress={() => setStageFilterPickerOpen(true)}
                        style={styles.detailValue}
                        disabled={stageFilterSaving}
                      >
                        <Text weight="semibold">{selectedStageFilter ? slugToLabel(selectedStageFilter) : 'Not set'}</Text>
                        <MaterialIcons name="edit" size={16} color={theme.colors.primary} />
                      </Pressable>
                      {stageFilterSaving ? (
                        <Text size="xs" tone="muted" style={{ marginTop: 4 }}>Updating...</Text>
                      ) : null}
                    </View>
                  </View>
                  <Meta line1="Lead status" line2={lead.status ? slugToLabel(lead.status) : '-'} />
                  {lead.referralName ? <Meta line1="Referral" line2={lead.referralName} /> : null}
                  {typeof lead.contactAttempts === 'number' ? (
                    <Meta line1="Contact attempts" line2={String(lead.contactAttempts)} />
                  ) : null}
                  {lead.lastContactedAt ? (
                    <Meta line1="Last contacted" line2={new Date(lead.lastContactedAt).toLocaleString()} />
                  ) : null}
                  {/* Occupation summary */}
                  {Array.isArray(lead.occupations) && lead.occupations.length > 0 ? (
                    <Meta
                      line1="Occupation"
                      line2={
                        lead.occupations
                          .map((o: any) => [o.profession, o.companyName, o.designation].filter(Boolean).join(' · '))
                          .join(' | ')
                      }
                    />
                  ) : null}
                </Card>

                {/* Remarks / Bio */}
                {(lead.remark || lead.bioText) ? (
                  <Card style={styles.card}>
                    <Text weight="semibold" style={styles.sectionTitle}>Remarks</Text>
                    {lead.remark ? <Text style={{ marginTop: 6 }}>{String(lead.remark)}</Text> : null}
                    {lead.bioText ? <Text style={{ marginTop: 12 }} tone="muted">{lead.bioText}</Text> : null}
                  </Card>
                ) : null}

                {/* Product */}
                {(lead.product || lead.investmentRange || lead.sipAmount) ? (
                  <Card style={styles.card}>
                    <Text weight="semibold" style={styles.sectionTitle}>Product & investment</Text>
                    {lead.product ? <Meta line1="Product" line2={slugToLabel(lead.product)} /> : null}
                    {lead.investmentRange ? <Meta line1="Investment range" line2={lead.investmentRange} /> : null}
                    {typeof lead.sipAmount === 'number' ? (
                      <Meta line1="SIP amount" line2={`₹${lead.sipAmount}`} />
                    ) : null}
                  </Card>
                ) : null}

                {/* Timeline */}
                {!!lead.events?.length && (
                  <Card style={[styles.card, { marginBottom: 24 }]}>
                    <Text weight="semibold" style={styles.sectionTitle}>Timeline</Text>
                    {lead.events.map((ev: any) => (
                      <View key={ev.id} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={{ flex: 1 }}>
                          <Text weight="semibold">{prettyType(ev.type)}</Text>
                          {ev.text ? <Text style={{ marginTop: 2 }} tone="muted">{ev.text}</Text> : null}
                          <Text size="sm" tone="muted" style={{ marginTop: 2 }}>
                            {new Date(ev.occurredAt).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                )}
              </ScrollView>
            )}

            {!!lead && (
              <SafeAreaView edges={['bottom']} style={styles.footer}>
                <Pressable onPress={() => refetch()} style={styles.footerBtn}>
                  <MaterialIcons name="refresh" size={18} color="#fff" />
                  <Text weight="bold" size="sm" style={{ color: '#fff', marginLeft: 6 }}>Refresh</Text>
                </Pressable>
                <Pressable onPress={handleStartCall} style={[styles.footerBtn, { backgroundColor: theme.colors.success }]}>
                  <MaterialIcons name="call" size={18} color="#fff" />
                  <Text weight="bold" size="sm" style={{ color: '#fff', marginLeft: 6 }}>Call</Text>
                </Pressable>
                <Pressable onPress={openManualLog} style={styles.footerBtn}>
                  <MaterialIcons name="note-add" size={18} color="#fff" />
                  <Text weight="bold" size="sm" style={{ color: '#fff', marginLeft: 6 }}>Log Interaction</Text>
                </Pressable>
              </SafeAreaView>
            )}
          </View>
        </View>
      </Modal>

      {/* Log Interaction Modal */}
      <Modal visible={logOpen} animationType="slide" transparent onRequestClose={closeLogModal}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '80%' }] }>
            <View style={styles.header}>
              <Text size="lg" weight="bold">Log Interaction</Text>
              <Pressable onPress={closeLogModal} style={styles.closeBtn} accessibilityLabel="Close">
                <MaterialIcons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.content}>
              <Text weight="semibold">Channel</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['CALL','WHATSAPP','EMAIL','SMS','OTHER'] as const).map((c) => (
                  <Pressable key={c} onPress={() => setChannel(c)} style={[styles.pill, channel===c && styles.pillActive]}>
                    <Text size="sm">{c}</Text>
                  </Pressable>
                ))}
              </View>

              {(callStartedAt || callEndedAt || callDurationSeconds != null) ? (
                <View style={{ marginTop: 12 }}>
                  <Text weight="semibold">Call summary</Text>
                  {callStartedAt ? (
                    <Text size="sm" tone="muted" style={{ marginTop: 4 }}>
                      Started: {new Date(callStartedAt).toLocaleString()}
                    </Text>
                  ) : null}
                  {callEndedAt ? (
                    <Text size="sm" tone="muted" style={{ marginTop: 2 }}>
                      Ended: {new Date(callEndedAt).toLocaleString()}
                    </Text>
                  ) : null}
                  {callDurationSeconds != null ? (
                    <Text size="sm" tone="muted" style={{ marginTop: 2 }}>
                      Duration: {Math.max(1, Math.round(callDurationSeconds))} sec
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text weight="semibold" style={{ marginTop: 14 }}>Lead stage</Text>
              <View style={styles.pillWrap}>
                {CLIENT_STAGE_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedStage(option)}
                    style={[styles.pill, selectedStage === option && styles.pillActive]}
                  >
                    <Text size="sm">{slugToLabel(option)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text weight="semibold" style={{ marginTop: 14 }}>Status filter</Text>
              <View style={styles.pillWrap}>
                {STAGE_FILTER_OPTIONS.map((option) => (
                  <Pressable
                    key={option ?? 'none'}
                    onPress={() => setSelectedStageFilter(option)}
                    style={[styles.pill, selectedStageFilter === option && styles.pillActive]}
                  >
                    <Text size="sm">{option ? slugToLabel(option) : 'Not set'}</Text>
                  </Pressable>
                ))}
              </View>

              <Text weight="semibold" style={{ marginTop: 10 }}>Note</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Summarize the call..."
                placeholderTextColor={theme.colors.muted}
                multiline
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 10, color: theme.colors.text, minHeight: 80 }}
              />

              <Text weight="semibold" style={{ marginTop: 10 }}>Next follow-up (ISO)</Text>
              <TextInput
                value={nextFollowUpAt ?? ''}
                onChangeText={setNextFollowUpAt}
                placeholder="e.g. 2025-11-04T10:30:00Z"
                placeholderTextColor={theme.colors.muted}
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 10, color: theme.colors.text }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Switch value={productExplained} onValueChange={setProductExplained} />
                <Text style={{ marginLeft: 8 }}>Product explained</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <Pressable onPress={closeLogModal} style={styles.footerBtn}>
                  <Text weight="bold" size="sm" style={{ color: '#fff' }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitInteraction} disabled={saving || !note.trim()} style={[styles.footerBtn, saving && { opacity: 0.7 }]}>
                  <Text weight="bold" size="sm" style={{ color: '#fff' }}>{saving ? 'Saving...' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={stagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStagePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setStagePickerOpen(false)} />
          <View style={styles.optionCard}>
            <Text weight="semibold" style={{ marginBottom: 8 }}>Select stage</Text>
            {CLIENT_STAGE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => handleStageSelect(option)}
                disabled={stageSaving}
                style={styles.optionRow}
              >
                <Text>{slugToLabel(option)}</Text>
                {selectedStage === option ? (
                  <MaterialIcons name="check" size={18} color={theme.colors.primary} />
                ) : null}
              </Pressable>
            ))}
            {stageSaving ? <ActivityIndicator style={{ marginTop: 8 }} color={theme.colors.primary} /> : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={stageFilterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStageFilterPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setStageFilterPickerOpen(false)} />
          <View style={styles.optionCard}>
            <Text weight="semibold" style={{ marginBottom: 8 }}>Select status filter</Text>
            {STAGE_FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option ?? 'none'}
                onPress={() => handleStageFilterSelect(option)}
                disabled={stageFilterSaving}
                style={styles.optionRow}
              >
                <Text>{option ? slugToLabel(option) : 'Not set'}</Text>
                {selectedStageFilter === option ? (
                  <MaterialIcons name="check" size={18} color={theme.colors.primary} />
                ) : null}
              </Pressable>
            ))}
            {stageFilterSaving ? <ActivityIndicator style={{ marginTop: 8 }} color={theme.colors.primary} /> : null}
          </View>
        </View>
      </Modal>

      {/* Call Follow-up Modal */}
      <CallFollowUpModal
        visible={isFollowUpOpen && !!leadId}
        durationSeconds={callDurationSeconds ?? 0}
        lead={
          callActiveLead?.id === leadId
            ? callActiveLead
            : leadId && lead
            ? {
                id: leadId,
                name: lead.name ?? undefined,
                phone: primaryPhone ?? undefined,
                clientStage: lead.clientStage ?? null,
                stageFilter: lead.stageFilter ?? null,
              }
            : callActiveLead
        }
        onClose={() => {
          closeFollowUp();
          // Optionally open log modal for stage updates after follow-up is saved
          if (leadId) {
            setLogOpen(true);
          }
        }}
      />
    </>
  );
}

function slugToLabel(stage?: string | null, fallback = '-') {
  if (!stage) return fallback;
  const s = stage.split('_');
  return s.map(x => x.charAt(0) + x.slice(1).toLowerCase()).join(' ');
}

function prettyType(t: string) {
  return slugToLabel(t);
}

function Meta({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text size="sm" tone="muted">{line1}</Text>
      <Text>{line2}</Text>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '92%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    closeBtn: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    card: { padding: theme.spacing.md },
    sectionTitle: { marginBottom: 6 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      marginTop: 8, gap: 10,
    },
    rowText: { flex: 1 },
    rowActions: { flexDirection: 'row', gap: 8 },
    iconBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12,
    },
    detailGrid: {
      marginTop: theme.spacing.sm,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    detailBox: {
      flex: 1,
      minWidth: 160,
      gap: 4,
    },
    detailValue: {
      marginTop: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
    },
    timelineItem: {
      flexDirection: 'row', gap: 12, marginTop: 10,
    },
    timelineDot: {
      width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 6,
    },
    footer: {
      padding: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    footerBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center',
    },
    pill: {
      borderRadius: 999,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pillActive: {
      borderColor: theme.colors.primary,
      backgroundColor: 'rgba(70,95,255,0.1)',
    },
    pillWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    optionCard: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: 6,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
  });
