// HomeDashboardScreen.tsx
import { useQuery } from "@apollo/client/react";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { ComponentProps, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingState } from "@/components/feedback/LoadingState";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { MY_ASSIGNED_LEADS } from "@/core/graphql/queries";
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
}[] = [
  {
    id: "all-leads",
    label: "All Leads",
    description: "View every active relationship",
    icon: "group",
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
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  clientStage?: string | null;
  createdAt?: string | null;
};

export const HomeDashboardScreen = () => {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
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
  const pageWidth = Math.max(width - theme.spacing.lg * 2, 280);

  // GraphQL query
  const { data, loading, error } = useQuery(MY_ASSIGNED_LEADS, {
    variables: { page: 1, pageSize: 100 },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const groupedByStage = useMemo(() => {
    const items: LeadLite[] = (data as any)?.myAssignedLeads?.items ?? [];
    const map = new Map<string, LeadLite[]>();
    for (const it of items) {
      const key = String(it?.clientStage ?? "NEW_LEAD");
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [data]);

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
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          >
            <Text weight="semibold" tone="default">{initials}</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text size="sm" tone="muted">Welcome back</Text>
            <Text size="lg" weight="semibold">{displayName}</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/profile')}
              style={styles.smallAvatar}
            >
              <MaterialIcons name="verified-user" size={18} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Quick actions */}
        <Card style={styles.quickCard}>
          <Text size="md" weight="semibold" style={styles.quickTitle}>
            Workspace shortcuts
          </Text>
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <View key={action.id} style={styles.quickAction}>
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
              </View>
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
            <LoadingState message="Retrieving your data…" />
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
                          <Text weight="semibold">{lead.name ?? "Unnamed"}</Text>
                          <Text size="sm" tone="muted">{lead.phone ?? ""}</Text>
                          {lead.email ? (
                            <Text size="sm" tone="muted">{lead.email}</Text>
                          ) : null}
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
    scrollContent: { paddingVertical: theme.spacing.lg, gap: theme.spacing.md },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
    },
    headerCopy: { flex: 1, marginLeft: theme.spacing.md },
    headerIcons: { flexDirection: "row", gap: theme.spacing.sm },
    smallAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quickCard: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.md,
    },
    quickTitle: { marginBottom: theme.spacing.sm },
    quickActions: { flexDirection: "column", gap: 8 },
    quickAction: { flexDirection: "row", alignItems: "center", gap: 12 },
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








