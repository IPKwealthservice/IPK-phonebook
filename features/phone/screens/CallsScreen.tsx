import { useQuery } from "@apollo/client/react";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { CALLS_TAB_QUERY, LEADS_QUERY } from "@/core/graphql/queries";
import { useTheme } from "@/core/theme/ThemeProvider";
import { formatPhone, humanizeEnum } from "@/core/utils/format";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { usePhoneCall } from "@/features/phone/hooks/usePhoneCall";

type CallBucketKey = "pending" | "missed";

type CallBucket = {
  key: CallBucketKey;
  label: string;
  description: string;
  tone: "primary" | "error";
  count: number;
};

type FollowUpLead = {
  id: string;
  name?: string | null;
  phone?: string | null;
  clientStage?: string | null;
  leadSource?: string | null;
  nextActionDueAt?: string | null;
};

type MissedCallLog = {
  id: string;
  leadId?: string | null;
  phoneNumber?: string | null;
  direction?: string | null;
  status?: string | null;
  failReason?: string | null;
  occurredAt?: string | null;
  createdByName?: string | null;
};

const isSameDay = (iso?: string | null) => {
  if (!iso) return false;
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatDueLabel = (iso?: string | null) => {
  if (!iso) return "No follow-up time";
  const due = new Date(iso);
  const now = new Date();
  const timeLabel = due.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const diffMs = due.getTime() - now.getTime();
  if (Math.abs(diffMs) < 60 * 1000) {
    return `Due now · ${timeLabel}`;
  }
  if (diffMs < 0) {
    const mins = Math.max(1, Math.round(Math.abs(diffMs) / 60000));
    return `Overdue by ${mins}m · ${timeLabel}`;
  }
  const mins = Math.round(diffMs / 60000);
  return `Due in ${mins}m · ${timeLabel}`;
};

const formatOccurredAt = (iso?: string | null) => {
  if (!iso) return "Time not captured";
  const dt = new Date(iso);
  return dt.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
};

export function CallsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { startCall, isCalling, activeLead } = usePhoneCall();
  const user = useAuthStore((s) => s.user);

  const leadArgs = useMemo(() => {
    const args: Record<string, any> = {
      page: 1,
      pageSize: 200,
    };
    if (user?.role === "RM" && user?.id) {
      args.assignedRmId = user.id;
    }
    return args;
  }, [user?.id, user?.role]);

  const {
    data: callData,
    loading: callsLoading,
    refetch: refetchCalls,
  } = useQuery(CALLS_TAB_QUERY, {
    variables: { limit: 50, includeMissed: true },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: leadsData,
    loading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery(LEADS_QUERY, {
    variables: { args: leadArgs },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const pendingLeads: FollowUpLead[] = useMemo(() => {
    const items: FollowUpLead[] = (leadsData as any)?.leads?.items ?? [];
    return items
      .filter((lead) => isSameDay(lead?.nextActionDueAt))
      .sort((a, b) => {
        const left = a?.nextActionDueAt
          ? new Date(a.nextActionDueAt).getTime()
          : 0;
        const right = b?.nextActionDueAt
          ? new Date(b.nextActionDueAt).getTime()
          : 0;
        return left - right;
      });
  }, [leadsData]);

  const missedCalls: MissedCallLog[] = useMemo(() => {
    const items: MissedCallLog[] = (callData as any)?.missedLeadCalls ?? [];
    return [...items].sort((a, b) => {
      const left = a?.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const right = b?.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return right - left;
    });
  }, [callData]);

  const buckets: CallBucket[] = useMemo(
    () => [
      {
        key: "pending",
        label: "Pending",
        description: "Follow up on today's scheduled calls.",
        tone: "primary",
        count: pendingLeads.length,
      },
      {
        key: "missed",
        label: "Missed",
        description: "Call back recent missed calls to re-engage.",
        tone: "error",
        count: missedCalls.length,
      },
    ],
    [missedCalls.length, pendingLeads.length]
  );

  const [activeBucket, setActiveBucket] = useState<CallBucketKey>("pending");

  const currentBucket = useMemo(
    () => buckets.find((bucket) => bucket.key === activeBucket) ?? buckets[0],
    [activeBucket, buckets]
  );

  const handleCallLead = useCallback(
    async (lead: { id?: string; name?: string | null; phone?: string | null }) => {
      if (!lead.phone) return;
      await startCall({
        leadId: lead.id,
        leadName: lead.name ?? undefined,
        phone: lead.phone ?? "",
      });
    },
    [startCall]
  );

  const refreshing = callsLoading || leadsLoading;
  const onRefresh = useCallback(() => {
    refetchCalls();
    refetchLeads();
  }, [refetchCalls, refetchLeads]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text size="xl" weight="bold">
            Calls
          </Text>
          <Text tone="muted" size="sm">
            Pending and missed calls in one place. Tap a tab to switch.
          </Text>
        </View>

        {isCalling && (
          <Card style={styles.liveCallCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.liveCallIcon}>
                <MaterialIcons name="phone-in-talk" size={20} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text weight="semibold">Active call</Text>
                {activeLead ? (
                  <Text size="sm" tone="muted">
                    {activeLead.name ?? "Lead"}{" "}
                    {activeLead.phone ? `· ${formatPhone(activeLead.phone)}` : ""}
                  </Text>
                ) : (
                  <Text size="sm" tone="muted">
                    Call in progress
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}

        <Card style={styles.bucketCard}>
          <View style={styles.tabRow}>
            {buckets.map((bucket) => {
              const active = bucket.key === activeBucket;
              return (
                <Pressable
                  key={bucket.key}
                  onPress={() => setActiveBucket(bucket.key)}
                  style={[
                    styles.tabPill,
                    active && {
                      backgroundColor:
                        bucket.tone === "error"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(70,95,255,0.12)",
                      borderColor:
                        bucket.tone === "error"
                          ? "#EF4444"
                          : theme.colors.primary,
                    },
                  ]}
                >
                  <Text
                    weight={active ? "bold" : "medium"}
                    style={{
                      color:
                        active && bucket.tone === "error"
                          ? "#991B1B"
                          : active
                          ? theme.colors.primary
                          : theme.colors.text,
                    }}
                  >
                    {bucket.label}
                  </Text>
                  <View style={styles.tabCount}>
                    <Text
                      size="sm"
                      weight="bold"
                      style={{
                        color: active ? "#fff" : theme.colors.text,
                      }}
                    >
                      {bucket.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 4, marginTop: 6 }}>
            <Text weight="semibold">{currentBucket.label} calls</Text>
            <Text tone="muted" size="sm">
              {currentBucket.description}
            </Text>
          </View>
        </Card>

        <View style={{ gap: theme.spacing.md }}>
          {activeBucket === "pending" &&
            pendingLeads.map((lead) => (
              <Card key={lead.id} style={styles.callCard}>
                <View style={styles.cardRow}>
                  <View style={styles.avatar}>
                    <Text weight="bold" style={{ color: theme.colors.primary }}>
                      {String(lead.name || "L").charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text weight="semibold">{lead.name ?? "Lead"}</Text>
                    {lead.phone ? (
                      <Text size="sm" tone="muted">
                        {formatPhone(lead.phone)}
                      </Text>
                    ) : null}
                    <Text size="sm" tone="muted">
                      {humanizeEnum(lead.clientStage ?? "FOLLOWING_UP")}
                      {lead.leadSource ? ` · ${lead.leadSource}` : ""}
                    </Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, styles.statusPrimary]}>
                        <MaterialIcons
                          name="schedule"
                          size={14}
                          color={theme.colors.primary}
                        />
                        <Text
                          size="xs"
                          weight="bold"
                          style={{
                            color: theme.colors.primary,
                          }}
                        >
                          Follow-up
                        </Text>
                      </View>
                      <Text size="sm" tone="muted">
                        {formatDueLabel(lead.nextActionDueAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {lead.phone ? (
                  <Pressable
                    onPress={() =>
                      handleCallLead({
                        id: lead.id,
                        name: lead.name,
                        phone: lead.phone,
                      })
                    }
                    style={[
                      styles.callButton,
                      {
                        backgroundColor: theme.colors.success,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="phone"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text weight="bold" size="sm" style={{ color: "#fff" }}>
                      Call now
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ))}

          {activeBucket === "missed" &&
            missedCalls.map((call) => (
              <Card key={call.id} style={styles.callCard}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                    <MaterialIcons name="call-missed" size={20} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text weight="semibold">
                      {call.phoneNumber ? formatPhone(call.phoneNumber) : "Unknown number"}
                    </Text>
                    {call.leadId ? (
                      <Text size="sm" tone="muted">
                        Lead ID: {call.leadId}
                      </Text>
                    ) : null}
                    <Text size="sm" tone="muted">
                      {call.failReason ? humanizeEnum(call.failReason) : "Missed call"} ·{" "}
                      {formatOccurredAt(call.occurredAt)}
                    </Text>
                    {call.createdByName ? (
                      <Text size="sm" tone="muted">
                        Logged by {call.createdByName}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {call.phoneNumber ? (
                  <Pressable
                    onPress={() =>
                      startCall({
                        leadId: call.leadId ?? undefined,
                        phone: call.phoneNumber ?? undefined,
                      })
                    }
                    style={[
                      styles.callButton,
                      {
                        backgroundColor: "#DC2626",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="phone"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text weight="bold" size="sm" style={{ color: "#fff" }}>
                      Call back
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ))}

          {activeBucket === "pending" && pendingLeads.length === 0 && (
            <Card style={{ alignItems: "center" }}>
              <Text weight="semibold">No pending calls for today</Text>
              <Text tone="muted" size="sm" style={{ textAlign: "center" }}>
                You are all caught up on today's follow-ups.
              </Text>
            </Card>
          )}

          {activeBucket === "missed" && missedCalls.length === 0 && (
            <Card style={{ alignItems: "center" }}>
              <Text weight="semibold">No missed calls</Text>
              <Text tone="muted" size="sm" style={{ textAlign: "center" }}>
                New missed calls will show up here automatically.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: { gap: 4 },
    liveCallCard: {
      padding: theme.spacing.md,
      borderRadius: 16,
      backgroundColor: "rgba(16,185,129,0.06)",
      borderWidth: 1,
      borderColor: "rgba(16,185,129,0.25)",
      marginBottom: theme.spacing.sm,
    },
    liveCallIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(34,197,94,0.1)",
    },
    bucketCard: { gap: theme.spacing.sm },
    tabRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    tabPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.card,
    },
    tabCount: {
      minWidth: 30,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1F2937",
      paddingHorizontal: 6,
    },
    callCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    cardRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(70,95,255,0.15)",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
      flexWrap: "wrap",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: "rgba(70,95,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(70,95,255,0.28)",
    },
    statusPrimary: {
      backgroundColor: "rgba(70,95,255,0.12)",
      borderColor: "rgba(70,95,255,0.28)",
    },
    statusDanger: {
      backgroundColor: "rgba(239,68,68,0.12)",
      borderColor: "rgba(239,68,68,0.35)",
    },
    callButton: {
      alignSelf: "flex-end",
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
  });

export default CallsScreen;
