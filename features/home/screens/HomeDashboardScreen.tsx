// HomeDashboardScreen.tsx
import { useQuery } from "@apollo/client/react";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { ComponentProps, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { LEADS_QUERY, MY_ASSIGNED_LEADS } from "@/core/graphql/gql/sales_queries";
import { useTheme } from "@/core/theme/ThemeProvider";
import { humanizeEnum } from "@/core/utils/format";
import { useAuthStore } from "@/features/auth/store/auth.store";
import LeadDetailSheet from "@/features/leads/screens/LeadDetailSheet";
import CallFollowUpModal from "@/features/phone/components/CallFollowUpModal";
import { usePhoneCall } from "@/features/phone/hooks/usePhoneCall";

const quickActions: {
  id: string;
  label: string;
  description: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  onPress?: () => void;
}[] = [
  {
    id: "all-leads",
    label: "All Leads",
    description: "View every active relationship",
    icon: "group",
    onPress: undefined, // injected with router in component
  },
  {
    id: "today-followups",
    label: "Today's Follow-ups",
    description: "Calls and tasks due today",
    icon: "today",
  },
];

function getInitials(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

type LeadLite = {
  id: string;
  leadCode?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  clientStage?: string | null;
  stageFilter?: string | null;
  createdAt?: string | null;
  assignedRM?: string | null;
  assignedRmId?: string | null;
};

export const HomeDashboardScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const {
    startCall,
    isFollowUpOpen,
    callDurationSeconds,
    activeLead,
    closeFollowUp,
  } = usePhoneCall();
  const router = useRouter();

  const displayName = user?.name ?? "IPK Wealth";
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const actionList = useMemo(
    () =>
      quickActions.map((action) =>
        action.id === "all-leads"
          ? { ...action, onPress: () => router.push("/(tabs)/leads") }
          : action.id === "today-followups"
          ? { ...action, onPress: () => router.push("/(tabs)/followups") }
          : action
      ),
    [router]
  );

  // GraphQL query
  const { data, loading, error } = useQuery(isAdmin ? LEADS_QUERY : MY_ASSIGNED_LEADS, {
    variables: isAdmin ? { args: { page: 1, pageSize: 500 } } : { page: 1, pageSize: 100 },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const groupedByStage = useMemo(() => {
    const items: LeadLite[] = isAdmin
      ? (data as any)?.leads?.items ?? []
      : (data as any)?.myAssignedLeads?.items ?? [];
    const map = new Map<string, LeadLite[]>();
    for (const it of items) {
      const key = String(it?.clientStage ?? "NEW_LEAD");
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [data, isAdmin]);

  const stageOrder = [
    "NEW_LEAD",
    "FIRST_TALK_DONE",
    "FOLLOWING_UP",
    "CLIENT_INTERESTED",
    "ACCOUNT_OPENED",
    "NO_RESPONSE_DORMANT",
    "NOT_INTERESTED_DORMANT",
    "RISKY_CLIENT_DORMANT",
    "HIBERNATED",
  ];

  const [selectedStage, setSelectedStage] = useState<string>("NEW_LEAD");

  const agingDays = (iso?: string | null) => {
    if (!iso) return undefined;
    const days = Math.floor(
      (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, days);
  };

  const [detailId, setDetailId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  
  const openLead = (id: string) => {
    setDetailId(id);
    setSheetVisible(true);
  };

  const placeCall = async (lead: LeadLite) => {
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome / profile card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/profile")}
              style={styles.heroAvatar}
            >
              <Text weight="bold" style={{ color: theme.colors.text }}>
                {initials}
              </Text>
            </Pressable>
            <View style={styles.heroCopy}>
              <Text size="xs" tone="muted">
                Welcome back
              </Text>
              <Text size="xl" weight="bold" style={styles.heroName}>
                {displayName}
              </Text>
              <Text size="sm" tone="muted">
                Keep conversations moving and never lose a lead.
              </Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/profile")}
                style={styles.heroActionBtn}
              >
                <MaterialIcons name="person" size={18} color={theme.colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/settings")}
                style={styles.heroActionBtn}
              >
                <MaterialIcons name="settings" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <Card style={styles.quickCard}>
          <Text size="md" weight="semibold" style={styles.quickTitle}>
            Workspace shortcuts
          </Text>
          <View style={styles.quickActions}>
            {actionList.map((action) => (
              <Pressable
                key={action.id}
                onPress={action.onPress}
                style={[
                  styles.quickAction,
                  action.onPress && { backgroundColor: theme.colors.card },
                ]}
              >
                <View style={styles.quickIcon}>
                  <MaterialIcons
                    name={action.icon}
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.quickContent}>
                  <Text weight="semibold">{action.label}</Text>
                  <Text tone="muted" size="sm">
                    {action.description}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.muted}
                />
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Stage filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            gap: 8,
          }}
        >
          {stageOrder.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSelectedStage(s)}
              style={[
                {
                  borderRadius: 18,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
                selectedStage === s && {
                  borderColor: theme.colors.primary,
                  backgroundColor: "rgba(70,95,255,0.08)",
                },
              ]}
            >
              <Text
                size="sm"
                weight={selectedStage === s ? "semibold" : "medium"}
              >
                {humanizeEnum(s)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Stage wise lead list */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
          {loading && (!groupedByStage.get(selectedStage) || groupedByStage.get(selectedStage)?.length === 0) && (
            <LoadingState message="Retrieving your data..." />
          )}

          {error && (
            <Text tone="error" style={{ textAlign: "center", marginTop: theme.spacing.md }}>
              Oops! Something went wrong.
            </Text>
          )}

          {(() => {
            const leads = groupedByStage.get(selectedStage) ?? [];
            if (!leads.length) {
              return (
                <Text tone="muted" style={{ textAlign: "center", marginTop: theme.spacing.md }}>
                  No leads in this stage.
                </Text>
              );
            }
            return (
              <Card style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text weight="semibold">{humanizeEnum(selectedStage)}</Text>
                  <Text tone="muted" size="sm">{leads.length}</Text>
                </View>
                <View style={{ marginTop: 8, gap: 8 }}>
                  {leads.map((lead) => (
                    <Pressable
                      key={lead.id}
                      onPress={() => openLead(lead.id)}
                      style={{ paddingVertical: 8 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: "rgba(70,95,255,0.15)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <Text weight="bold" style={{ color: theme.colors.primary }}>
                            {String(lead.name || "L").charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          {/* Lead Code - prominently displayed */}
                          {lead.leadCode ? (
                            <Text weight="bold" size="xs" style={{ color: theme.colors.primary }}>
                              {lead.leadCode}
                            </Text>
                          ) : null}
                          {/* First Name and Last Name */}
                          <Text weight="semibold">
                            {([lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.name) ?? "Unnamed"}
                          </Text>
                          {/* Phone Number */}
                          <Text size="sm" tone="muted">{lead.phone ?? ""}</Text>
                          {/* RM assignment - shown ONLY for Admin */}
                          {isAdmin && (
                            <Text size="sm" tone="muted">RM: {lead.assignedRM ?? "Unassigned"}</Text>
                          )}
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text size="sm" tone="muted">{agingDays(lead.createdAt)}d</Text>
                          <Pressable
                            onPress={() => placeCall(lead)}
                            style={{
                              marginTop: 6,
                              backgroundColor: theme.colors.success,
                              borderRadius: 16,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                            }}
                          >
                            <Text size="sm" weight="bold" style={{ color: "#fff" }}>
                              Call
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </Card>
            );
          })()}
        </View>
      </ScrollView>

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
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { paddingVertical: theme.spacing.lg, gap: theme.spacing.lg },
    heroCard: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.scheme === "dark" ? "#0F172A" : "#EEF2FF",
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    heroCopy: { flex: 1, marginLeft: theme.spacing.md, gap: 4 },
    heroName: { letterSpacing: 0.2 },
    heroActions: { flexDirection: "row", gap: theme.spacing.xs },
    heroActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.scheme === "dark" ? "#111827" : "#fff",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quickCard: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
    },
    quickTitle: { marginBottom: theme.spacing.sm },
    quickActions: { flexDirection: "column", gap: 10 },
    quickAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.md,
    },
    quickIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(70,95,255,0.12)",
    },
    quickContent: { flex: 1 },
  });

export default HomeDashboardScreen;




