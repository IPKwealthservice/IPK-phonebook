/** ------------------------------------------------------------------
 *  LeadDetailSheet.tsx
 *  — Includes:
 *    ✓ Scroll fix
 *    ✓ Nested scrolling
 *    ✓ Scrollable remarks
 *    ✓ Scrollable timeline
 *    ✓ UI improvements
 *    ✓ Memoized styles (perf tweak)
 * ------------------------------------------------------------------ */

import { useQuery } from "@apollo/client/react";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { GET_FULL_LEAD_PROFILE } from "@/core/graphql/queries";
import { useTheme } from "@/core/theme/ThemeProvider";
import { updateLeadAfterCall } from "@/features/leads/services/interactions.service";
import CallFollowUpModal from "@/features/phone/components/CallFollowUpModal";
import { usePhoneCall } from "@/features/phone/hooks/usePhoneCall";

type Props = {
  leadId: string | null;
  visible: boolean;
  onClose: () => void;
};

type RemarkItem =
  | string
  | {
      at?: string | null;
      byName?: string | null;
      text?: string | null;
    };

export default function LeadDetailSheet({ leadId, visible, onClose }: Props) {
  const theme = useTheme();
  // 👇 Memoize styles so they are not recreated on every render
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const sheetAnim = useRef(new Animated.Value(1)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;

  const { data, loading, error, refetch } = useQuery(GET_FULL_LEAD_PROFILE, {
    variables: { leadId: leadId! },
    skip: !leadId,
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  const lead = (data as any)?.lead;
  const applications = (data as any)?.applications ?? [];

  const name = useMemo(
    () =>
      lead?.name ||
      [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
      "Lead",
    [lead?.name, lead?.firstName, lead?.lastName]
  );

  const initials = useMemo(
    () => getInitials(name || lead?.leadCode || ""),
    [name, lead?.leadCode]
  );

  const primaryPhone = useMemo(() => {
    if (!lead?.phones?.length) return lead?.phone ?? null;
    const preferred = lead.phones.find((p: any) => p?.isPrimary);
    return (
      preferred?.number ?? lead?.phones?.[0]?.number ?? lead?.phone ?? null
    );
  }, [lead?.phone, lead?.phones]);

  const agingDays = useMemo(
    () => getAgingDays(lead?.createdAt),
    [lead?.createdAt]
  );

  const [logOpen, setLogOpen] = useState(false);
  const [note, setNote] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [channel, setChannel] = useState<
    "CALL" | "WHATSAPP" | "EMAIL" | "OTHER"
  >("CALL");
  const [saving, setSaving] = useState(false);

  const {
    startCall,
    isFollowUpOpen,
    callDurationSeconds,
    activeLead: callActiveLead,
    closeFollowUp,
  } = usePhoneCall();

  useEffect(() => {
    if (visible && leadId) {
      refetch({ leadId }).catch(() => {});
    }
  }, [visible, leadId]);

  const handleCopy = async (value?: string | null) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
  };

  const openWhatsApp = async (phone?: string | null) => {
    if (!phone) return;
    const normalized = phone.replace(/\s|[-()]/g, "");
    const url = `whatsapp://send?phone=${normalized}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) Linking.openURL(url);
      else Alert.alert("WhatsApp", "WhatsApp is not installed on this device.");
    } catch {}
  };

  const handleCall = async () => {
    if (!leadId || !primaryPhone) return;
    try {
      await startCall({ leadId, leadName: name, phone: primaryPhone });
    } catch {
      Alert.alert("Call", "Unable to open the dialer.");
    }
  };

  const handleLogInteraction = async () => {
    if (!leadId || !note.trim()) return;
    setSaving(true);
    try {
      await updateLeadAfterCall({
        leadId,
        channel,
        note: note.trim(),
        nextFollowUpAt: nextFollowUpAt || null,
        stage: lead?.clientStage,
        stageFilter: lead?.stageFilter ?? null,
        saveRemark: true,
      });
      await refetch();
      setNote("");
      setNextFollowUpAt("");
      setLogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const remarks: RemarkItem[] = useMemo(() => {
    if (!lead?.remark) return [];
    if (Array.isArray(lead.remark)) return lead.remark;
    return [lead.remark];
  }, [lead?.remark]);

  const qaList = Array.isArray(lead?.clientQa) ? lead.clientQa : [];
  const timeline = Array.isArray(lead?.events) ? lead.events : [];
  const phones = Array.isArray(lead?.phones) ? lead.phones : [];

  return (
    <>
      {/* ===========================================================
       *  MAIN LEAD MODAL
       * =========================================================== */}
      <Modal
        visible={visible && !!leadId}
        animationType="slide"
        transparent
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheet}>
              <SafeAreaView edges={["top"]} style={styles.safeArea}>
                {/* Header */}
                <View style={styles.handleContainer}>
                  <Pressable onPress={onClose} style={styles.handlePressable}>
                    <View style={styles.handle} />
                  </Pressable>
                </View>

                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text size="md" weight="bold">
                      Lead Profile
                    </Text>
                    {lead?.leadCode && (
                      <Text size="sm" tone="muted">
                        {lead.leadCode}
                      </Text>
                    )}
                  </View>

                  <Pressable onPress={onClose} style={styles.closeBtn}>
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={theme.colors.text}
                    />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  scrollEventThrottle={16}
                  bounces={true}
                  alwaysBounceVertical={false}
                  removeClippedSubviews={true}
                >
                  {loading ? (
                    renderSkeleton(theme)
                  ) : error ? (
                    <Card style={styles.card}>
                      <Text weight="semibold">Unable to load lead</Text>
                      <Button
                        label="Retry"
                        onPress={() => refetch({ leadId: leadId! })}
                        style={{ marginTop: theme.spacing.md }}
                      />
                    </Card>
                  ) : !lead ? (
                    <LoadingState message="Fetching profile..." />
                  ) : (
                    <>
                      {/* A. PROFILE HEADER */}
                      <Card style={[styles.card, styles.sectionCard]}>
                        <View style={styles.profileRow}>
                          <View style={styles.avatar}>
                            <Text weight="bold">{initials}</Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text weight="bold">{name}</Text>

                            {lead.leadCode && (
                              <View style={styles.tagRow}>
                                <View style={[styles.tag, styles.codeTag]}>
                                  <Text
                                    size="sm"
                                    weight="semibold"
                                    style={{ color: theme.colors.primary }}
                                  >
                                    {lead.leadCode}
                                  </Text>
                                </View>
                              </View>
                            )}

                            <View style={styles.contactRow}>
                              <MaterialIcons
                                name="phone"
                                size={16}
                                color={theme.colors.primary}
                              />
                              <Text weight="semibold">
                                {primaryPhone ?? "-"}
                              </Text>
                            </View>

                            {lead.email && (
                              <View style={styles.contactRow}>
                                <MaterialIcons
                                  name="email"
                                  size={16}
                                  color={theme.colors.primary}
                                />
                                <Text weight="semibold">{lead.email}</Text>
                              </View>
                            )}

                            {/* ACTIONS */}
                            <View style={styles.actionRow}>
                              <ActionChip
                                icon="call"
                                label="Call"
                                bg={theme.colors.success}
                                onPress={handleCall}
                              />
                              <ActionChip
                                icon="whatsapp"
                                label="WhatsApp"
                                bg="#25D366"
                                useCommunityIcon
                                onPress={() => openWhatsApp(primaryPhone)}
                              />
                              <ActionChip
                                icon="content-copy"
                                label="Copy"
                                bg={theme.colors.border}
                                textColor={theme.colors.text}
                                onPress={() => handleCopy(primaryPhone)}
                              />
                            </View>
                          </View>
                        </View>
                      </Card>

                      {/* B. CONTACT INFORMATION */}
                      <Card style={[styles.card, styles.sectionCard]}>
                        <Text weight="semibold" style={styles.sectionTitle}>
                          Contact Information
                        </Text>

                        <View style={styles.infoGrid}>
                          <InfoItem label="Email" value={lead.email ?? "-"} />
                          <InfoItem
                            label="Location"
                            value={lead.location ?? "-"}
                          />
                          <InfoItem
                            label="Product"
                            value={
                              lead.product ? slugToLabel(lead.product) : "-"
                            }
                          />
                          <InfoItem
                            label="Investment Range"
                            value={lead.investmentRange ?? "-"}
                          />
                          <InfoItem
                            label="Lead Source"
                            value={
                              <View style={styles.leadSource}>
                                <Text
                                  size="sm"
                                  weight="semibold"
                                  style={{ color: theme.colors.primary }}
                                >
                                  {lead.leadSource
                                    ? slugToLabel(lead.leadSource)
                                    : "Unknown"}
                                </Text>
                              </View>
                            }
                          />
                          <InfoItem
                            label="Created / Entered on"
                            value={formatDate(lead.createdAt)}
                          />
                          <InfoItem
                            label="Aging Days"
                            value={`${agingDays} days`}
                          />
                          <InfoItem
                            label="Last Contact"
                            value={formatDateTime(lead.lastContactedAt)}
                          />
                          <InfoItem
                            label="Stage"
                            value={slugToLabel(lead.clientStage)}
                          />
                          <InfoItem
                            label="Status"
                            value={slugToLabel(lead.status)}
                          />
                          <InfoItem
                            label="Next Follow-up"
                            value={formatDateTime(lead.nextActionDueAt)}
                          />
                        </View>
                      </Card>

                      {/* C. PHONE NUMBERS */}
                      {phones.length > 0 && (
                        <Card style={[styles.card, styles.sectionCard]}>
                          <Text weight="semibold" style={styles.sectionTitle}>
                            Alternative Phone Numbers
                          </Text>

                          {phones.map((phone: any) => (
                            <View
                              key={phone.id ?? phone.number}
                              style={styles.altPhoneRow}
                            >
                              <View style={styles.altIcon}>
                                <MaterialIcons
                                  name={
                                    phone.isPrimary ? "star" : "phone"
                                  }
                                  size={16}
                                  color={theme.colors.primary}
                                />
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text weight="semibold">
                                  {phone.number}
                                </Text>
                                <Text size="sm" tone="muted">
                                  {phone.label ??
                                    (phone.isPrimary
                                      ? "Primary"
                                      : "Alternate")}
                                </Text>
                              </View>

                              <Pressable
                                onPress={() => handleCopy(phone.number)}
                              >
                                <MaterialIcons
                                  name="content-copy"
                                  size={18}
                                  color={theme.colors.text}
                                />
                              </Pressable>
                            </View>
                          ))}
                        </Card>
                      )}

                      {/* D. OCCUPATIONS */}
                      {lead.occupations?.length > 0 && (
                        <Card style={[styles.card, styles.sectionCard]}>
                          <Text weight="semibold" style={styles.sectionTitle}>
                            Occupations
                          </Text>

                          {lead.occupations.map((occ: any, idx: number) => (
                            <View
                              key={`occ-${idx}`}
                              style={styles.occupationRow}
                            >
                              <Text weight="semibold">
                                {occ.profession ?? "Role"}
                              </Text>
                              <Text size="sm" tone="muted">
                                {occ.designation ?? "-"}
                              </Text>
                              <Text size="sm" tone="muted">
                                {occ.companyName ?? "-"}
                              </Text>
                            </View>
                          ))}
                        </Card>
                      )}

                      {/* E. APPLICATIONS */}
                      {applications.length > 0 && (
                        <Card style={[styles.card, styles.sectionCard]}>
                          <Text weight="semibold" style={styles.sectionTitle}>
                            Account Applications
                          </Text>

                          {applications.map((app: any) => (
                            <View
                              key={app.id}
                              style={styles.applicationRow}
                            >
                              <View style={{ flex: 1 }}>
                                <Text weight="semibold">
                                  Application #{app.id.slice(-8)}
                                </Text>
                                <Text size="sm" tone="muted">
                                  Status:{" "}
                                  {slugToLabel(app.applicationStatus)}
                                </Text>
                                <Text size="sm" tone="muted">
                                  KYC: {slugToLabel(app.kycStatus)}
                                </Text>
                                <Text size="sm" tone="muted">
                                  Risk Profile:{" "}
                                  {app.riskProfile
                                    ? slugToLabel(app.riskProfile)
                                    : "-"}
                                </Text>
                              </View>

                              <View style={{ gap: 6 }}>
                                <InfoPill
                                  label="Submitted"
                                  value={formatDate(app.submittedAt)}
                                />
                                {app.reviewedAt && (
                                  <InfoPill
                                    label="Reviewed"
                                    value={formatDate(app.reviewedAt)}
                                  />
                                )}
                                {app.approvedAt && (
                                  <InfoPill
                                    label="Approved"
                                    value={formatDate(app.approvedAt)}
                                  />
                                )}
                              </View>
                            </View>
                          ))}
                        </Card>
                      )}

                      {/* F. REMARKS */}
                      {remarks.length > 0 && (
                        <Card style={[styles.card, styles.sectionCard]}>
                          <Text weight="semibold" style={styles.sectionTitle}>
                            Remarks
                          </Text>

                          <View style={styles.remarksContainer}>
                            {remarks.map((r, idx) => {
                              const remarkText =
                                typeof r === "string" ? r : r?.text;
                              const by =
                                typeof r === "string" ? null : r?.byName;
                              const at =
                                typeof r === "string" ? null : r?.at;

                              return (
                                <View
                                  key={`r-${idx}`}
                                  style={styles.remarkRow}
                                >
                                  <Text>{remarkText ?? "-"}</Text>
                                  <Text
                                    size="sm"
                                    tone="muted"
                                    style={{ marginTop: 2 }}
                                  >
                                    {by ? `${by} / ` : ""}
                                    {at ? formatDateTime(at) : ""}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </Card>
                      )}

                      {/* G. CLIENT QA */}
                      {qaList.length > 0 && (
                        <Card style={[styles.card, styles.sectionCard]}>
                          <Text weight="semibold" style={styles.sectionTitle}>
                            Client Q&A
                          </Text>

                          {qaList.map((qa: any, idx: number) => (
                            <View key={`qa-${idx}`} style={styles.qaRow}>
                              <Text size="sm" tone="muted">
                                Q: {qa.question}
                              </Text>
                              <Text
                                weight="semibold"
                                style={{ marginTop: 4 }}
                              >
                                A: {qa.answer ?? "-"}
                              </Text>
                            </View>
                          ))}
                        </Card>
                      )}

                      {/* H. EVENT TIMELINE */}
                      {timeline.length > 0 && (
                        <Card style={[styles.card, styles.sectionCard]}>
                          <Text weight="semibold" style={styles.sectionTitle}>
                            Event Timeline
                          </Text>

                          <View style={styles.timelineContainer}>
                            {timeline.map((event: any) => (
                              <View
                                key={event.id}
                                style={styles.timelineRow}
                              >
                                <View style={styles.timelineDot} />

                                <View style={styles.timelineContent}>
                                  <Text weight="semibold" numberOfLines={2}>
                                    {slugToLabel(event.type)}
                                  </Text>

                                  {event.text && (
                                    <Text
                                      size="sm"
                                      tone="muted"
                                      style={{ marginTop: 2 }}
                                      numberOfLines={3}
                                    >
                                      {event.text}
                                    </Text>
                                  )}

                                  <Text
                                    size="sm"
                                    tone="muted"
                                    style={{ marginTop: 2 }}
                                    numberOfLines={1}
                                  >
                                    {formatDateTime(event.occurredAt)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </Card>
                      )}
                    </>
                  )}
                </ScrollView>
              </SafeAreaView>

              {/* Bottom FAB */}
              {lead && (
                <SafeAreaView edges={["bottom"]} style={styles.fabContainer}>
                  <View style={styles.fabCluster}>
                    <FabAction
                      icon={
                        <MaterialIcons name="phone" size={18} color="#fff" />
                      }
                      label="Call"
                      onPress={handleCall}
                      background={theme.colors.success}
                    />
                    <FabAction
                      icon={
                        <MaterialCommunityIcons
                          name="whatsapp"
                          size={18}
                          color="#fff"
                        />
                      }
                      label="WhatsApp"
                      onPress={() => openWhatsApp(primaryPhone)}
                      background="#25D366"
                    />
                    <FabAction
                      icon={
                        <MaterialIcons
                          name="note-add"
                          size={18}
                          color="#fff"
                        />
                      }
                      label="Log"
                      onPress={() => setLogOpen(true)}
                      background={theme.colors.primary}
                    />
                  </View>
                </SafeAreaView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== LOG INTERACTION MODAL ===================== */}
      <Modal
        visible={logOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={[styles.card, styles.logCard]}>
            <View style={styles.modalHeader}>
              <Text size="lg" weight="bold">
                Log Interaction
              </Text>
              <Pressable onPress={() => setLogOpen(false)}>
                <MaterialIcons
                  name="close"
                  size={22}
                  color={theme.colors.text}
                />
              </Pressable>
            </View>

            <View style={{ gap: theme.spacing.md }}>
              {/* CHANNEL SELECT */}
              <View style={styles.channelRow}>
                {["CALL", "WHATSAPP", "EMAIL", "OTHER"].map((option) => {
                  const selected = channel === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setChannel(option as any)}
                      style={[
                        styles.channelPill,
                        selected && {
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text
                        size="sm"
                        weight="semibold"
                        style={{
                          color: selected ? "#fff" : theme.colors.text,
                        }}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field
                label="Notes"
                multiline
                numberOfLines={4}
                value={note}
                onChangeText={setNote}
                style={{
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />

              <Field
                label="Next follow-up (ISO)"
                value={nextFollowUpAt}
                onChangeText={setNextFollowUpAt}
              />

              <Button
                label={saving ? "Saving..." : "Save interaction"}
                onPress={handleLogInteraction}
                disabled={saving || !note.trim()}
                loading={saving}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* ===================== FOLLOW UP MODAL ===================== */}
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
          setLogOpen(true);
        }}
      />
    </>
  );
}

/* ================================================================
 *  HELPERS
 * ================================================================ */
function getInitials(fullName: string) {
  if (!fullName) return "LD";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function slugToLabel(value?: string | null) {
  if (!value) return "";
  return value
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function getAgingDays(createdAt?: string | null) {
  if (!createdAt) return null;
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

/* ================================================================
 *  STYLES
 * ================================================================ */
const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.55)",
    },

    sheetContainer: {
      width: "100%",
      maxHeight: "96%",
    },

    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      overflow: "hidden",
      height: "100%",
      maxHeight: "96%",
    },

    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 12,
      paddingBottom: 150,
      paddingTop: 6,
      gap: 10,
    },

    header: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    handleContainer: {
      alignItems: "center",
      paddingTop: 6,
      paddingBottom: 4,
    },

    handlePressable: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },

    handle: {
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
    },

    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      alignItems: "center",
      justifyContent: "center",
    },

    card: {
      padding: 10,
    },

    sectionCard: {
      marginTop: 6,
    },

    sectionTitle: {
      fontSize: 13,
      marginBottom: 6,
      fontWeight: "600",
    },

    profileRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    tagRow: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
      marginTop: 4,
    },

    tag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    codeTag: {
      backgroundColor: "rgba(70,95,255,0.08)",
      borderColor: theme.colors.primary,
    },

    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },

    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 6,
    },

    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    infoItem: {
      width: "48%",
    },

    leadSource: {
      backgroundColor: "rgba(70,95,255,0.12)",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
    },

    altPhoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 6,
    },

    altIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    occupationRow: {
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
    },

    applicationRow: {
      flexDirection: "row",
      paddingVertical: 6,
      gap: 10,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
    },

    remarksContainer: {
      maxHeight: 300,
    },

    remarkRow: {
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
    },

    qaRow: {
      gap: 4,
      paddingVertical: 3,
    },

    timelineContainer: {
      maxHeight: 400,
      overflow: "hidden",
    },

    timelineRow: {
      flexDirection: "row",
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: "flex-start",
      minHeight: 50,
    },

    timelineContent: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },

    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 6,
      backgroundColor: theme.colors.primary,
      flexShrink: 0,
    },

    fabContainer: {
      backgroundColor: theme.colors.background,
      paddingTop: 8,
    },

    fabCluster: {
      position: "absolute",
      right: 12,
      bottom: 12,
      gap: 6,
      alignItems: "flex-end",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },

    logCard: {
      width: "100%",
      maxWidth: 480,
    },

    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },

    channelRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    channelPill: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
  });

/* ================================================================
 *  SUB COMPONENTS
 * ================================================================ */

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <View style={{ width: "48%", marginBottom: 4 }}>
    <Text size="sm" tone="muted">
      {label}
    </Text>

    {typeof value === "string" || typeof value === "number" ? (
      <Text weight="semibold">{value || "-"}</Text>
    ) : (
      value ?? <Text weight="semibold">-</Text>
    )}
  </View>
);

const InfoPill = ({ label, value }: { label: string; value?: string }) => (
  <View
    style={{
      backgroundColor: "#f7f7f7",
      borderWidth: 1,
      borderColor: "#ccc",
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
    }}
  >
    <Text size="sm" tone="muted">
      {label}
    </Text>
    <Text weight="semibold">{value ?? "-"}</Text>
  </View>
);

const ActionChip = ({
  icon,
  label,
  onPress,
  bg,
  textColor,
  useCommunityIcon,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  bg: string;
  textColor?: string;
  useCommunityIcon?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={{
      backgroundColor: bg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    {useCommunityIcon ? (
      <MaterialCommunityIcons
        name={icon}
        size={13}
        color={textColor ?? "#fff"}
      />
    ) : (
      <MaterialIcons name={icon} size={13} color={textColor ?? "#fff"} />
    )}

    <Text
      weight="semibold"
      size="sm"
      style={{ marginLeft: 4, color: textColor ?? "#fff" }}
    >
      {label}
    </Text>
  </Pressable>
);

const FabAction = ({
  icon,
  label,
  onPress,
  background,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  background: string;
}) => (
  <Pressable
    onPress={onPress}
    style={{
      backgroundColor: background,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      elevation: 4,
    }}
  >
    {icon}
    <Text weight="bold" size="sm" style={{ color: "#fff" }}>
      {label}
    </Text>
  </Pressable>
);

/* ================================================================
 *  SKELETON
 * ================================================================ */
function renderSkeleton(theme: any) {
  return (
    <View style={{ gap: theme.spacing.lg }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} style={{ padding: 12 }}>
          <Skeleton style={{ height: 22, marginBottom: 10 }} />
          <Skeleton style={{ height: 16, width: "90%" }} />
          <Skeleton style={{ height: 16, width: "50%", marginTop: 8 }} />
        </Card>
      ))}
    </View>
  );
}
