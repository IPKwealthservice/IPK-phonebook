import { useQuery } from "@apollo/client/react";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { LEADS_QUERY } from "@/core/graphql/queries";
import { useTheme } from "@/core/theme/ThemeProvider";
import { humanizeEnum } from "@/core/utils/format";
import { useAuthStore } from "@/features/auth/store/auth.store";
import LeadDetailSheet from "@/features/leads/screens/LeadDetailSheet";
import CallFollowUpModal from "@/features/phone/components/CallFollowUpModal";
import { usePhoneCall } from "@/features/phone/hooks/usePhoneCall";

type FollowUpLead = {
  id: string;
  leadCode?: string | null;
  name?: string | null;
  phone?: string | null;
  leadSource?: string | null;
  clientStage?: string | null;
  stageFilter?: string | null;
  assignedRM?: string | null;
  assignedRmId?: string | null;
  nextActionDueAt?: string | null;
};

const buildTodayWindow = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const isDueToday = (iso?: string | null, window = buildTodayWindow()) => {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  return due >= window.start && due <= window.end;
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
    return `Due now • ${timeLabel}`;
  }
  if (diffMs < 0) {
    const mins = Math.max(1, Math.round(Math.abs(diffMs) / 60000));
    return `Overdue by ${mins}m • ${timeLabel}`;
  }
  const mins = Math.round(diffMs / 60000);
  return `Due in ${mins}m • ${timeLabel}`;
};

export function TodaysFollowUpsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const user = useAuthStore((s) => s.user);

  const {
    startCall,
    isFollowUpOpen,
    callDurationSeconds,
    activeLead,
    closeFollowUp,
  } = usePhoneCall();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

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

  const { data, loading, refetch } = useQuery(LEADS_QUERY, {
    variables: { args: leadArgs },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const todayWindow = useMemo(buildTodayWindow, []);

  const leads: FollowUpLead[] = useMemo(() => {
    const items: FollowUpLead[] = (data as any)?.leads?.items ?? [];
    return items
      .filter((item) => isDueToday(item?.nextActionDueAt, todayWindow))
      .sort((a, b) => {
        const left = a?.nextActionDueAt
          ? new Date(a.nextActionDueAt).getTime()
          : 0;
        const right = b?.nextActionDueAt
          ? new Date(b.nextActionDueAt).getTime()
          : 0;
        return left - right;
      });
  }, [data, todayWindow]);

  const openLead = (id: string) => {
    setDetailId(id);
    setSheetVisible(true);
  };

  const placeCall = async (lead: FollowUpLead) => {
    if (!lead.phone) return;
    await startCall({
      leadId: lead.id,
      leadName: lead.name ?? undefined,
      phone: lead.phone,
      clientStage: lead.clientStage ?? null,
      stageFilter: lead.stageFilter ?? null,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <FlatList
        data={leads}
        keyExtractor={(it) => it.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text size="lg" weight="bold">
              Today&apos;s follow-ups
            </Text>
            <Text tone="muted" size="sm">
              Call the leads scheduled for today and review their identity.
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryPill}>
                <MaterialIcons
                  name="today"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text weight="semibold">
                  {leads.length} due today
                </Text>
              </View>
              {user?.name ? (
                <Text tone="muted" size="sm">
                  Assigned to {user.name}
                </Text>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openLead(item.id)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text weight="bold" style={{ color: theme.colors.primary }}>
                    {String(item.name || "L").charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text weight="semibold">{item.name ?? "Unnamed"}</Text>
                  {item.phone ? (
                    <Text size="sm" tone="muted">
                      {item.phone}
                    </Text>
                  ) : null}
                  <Text size="sm" tone="muted">
                    {humanizeEnum(item.clientStage ?? "FOLLOWING_UP")}
                    {item.leadSource ? ` • ${item.leadSource}` : ""}
                  </Text>
                  <Text size="sm" tone="muted">
                    {formatDueLabel(item.nextActionDueAt)}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.callButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      placeCall(item);
                    }}
                  >
                    <MaterialIcons name="call" size={18} color="#fff" />
                    <Text
                      weight="bold"
                      size="sm"
                      style={{ color: "#fff", marginLeft: 6 }}
                    >
                      Call
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.identityButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openLead(item.id);
                    }}
                  >
                    <MaterialIcons
                      name="badge"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      weight="semibold"
                      size="sm"
                      style={{ color: theme.colors.primary, marginLeft: 6 }}
                    >
                      Identity
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <LoadingState message="Retrieving today's follow-ups..." />
            ) : (
              <Text tone="muted">No follow-ups scheduled for today.</Text>
            )}
          </View>
        }
      />

      <LeadDetailSheet
        leadId={detailId}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />

      <CallFollowUpModal
        visible={isFollowUpOpen}
        durationSeconds={callDurationSeconds ?? 0}
        lead={activeLead}
        onClose={closeFollowUp}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    list: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: {
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    summaryPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    card: { padding: theme.spacing.md },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(70,95,255,0.15)",
    },
    actions: {
      alignItems: "flex-end",
      gap: 8,
    },
    callButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.success,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    identityButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(70,95,255,0.12)",
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    empty: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default TodaysFollowUpsScreen;
