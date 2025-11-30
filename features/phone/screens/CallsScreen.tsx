import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/core/theme/ThemeProvider";
import { formatPhone } from "@/core/utils/format";
import { leadCatalogue, Lead } from "@/features/home/data/leadData";
import { usePhoneCall } from "@/features/phone/hooks/usePhoneCall";

type CallBucketKey = "pending" | "missed";

type CallBucket = {
  key: CallBucketKey;
  label: string;
  description: string;
  tone: "primary" | "error";
  entries: Lead[];
};

export function CallsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { startCall } = usePhoneCall();

  const buckets: CallBucket[] = useMemo(
    () => [
      {
        key: "pending",
        label: "Pending",
        description: "Follow up on these calls before they slip.",
        tone: "primary",
        entries: leadCatalogue["Pending Calls"] ?? [],
      },
      {
        key: "missed",
        label: "Missed",
        description: "Call back recent missed calls to re-engage.",
        tone: "error",
        entries: leadCatalogue["Missed Calls"] ?? [],
      },
    ],
    []
  );

  const [activeBucket, setActiveBucket] = useState<CallBucketKey>("pending");

  const currentBucket = useMemo(
    () => buckets.find((bucket) => bucket.key === activeBucket) ?? buckets[0],
    [activeBucket, buckets]
  );

  const handleCallLead = async (lead: Lead) => {
    await startCall({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
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
                      backgroundColor: bucket.tone === "error"
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
                      {bucket.entries.length}
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
          {currentBucket.entries.map((lead) => (
            <Card key={lead.id} style={styles.callCard}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text weight="bold" style={{ color: theme.colors.primary }}>
                    {lead.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold">{lead.name}</Text>
                  <Text size="sm" tone="muted">
                    {formatPhone(lead.phone)}
                  </Text>
                  {lead.company ? (
                    <Text size="sm" tone="muted">
                      {lead.company}
                    </Text>
                  ) : null}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        currentBucket.tone === "error"
                          ? styles.statusDanger
                          : styles.statusPrimary,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          currentBucket.tone === "error"
                            ? "call-missed"
                            : "schedule"
                        }
                        size={14}
                        color={
                          currentBucket.tone === "error"
                            ? "#B91C1C"
                            : theme.colors.primary
                        }
                      />
                      <Text
                        size="xs"
                        weight="bold"
                        style={{
                          color:
                            currentBucket.tone === "error"
                              ? "#B91C1C"
                              : theme.colors.primary,
                        }}
                      >
                        {currentBucket.label}
                      </Text>
                    </View>
                    <Text size="sm" tone="muted">
                      {lead.status}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => handleCallLead(lead)}
                style={[
                  styles.callButton,
                  {
                    backgroundColor:
                      currentBucket.tone === "error"
                        ? "#DC2626"
                        : theme.colors.success,
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
            </Card>
          ))}

          {currentBucket.entries.length === 0 && (
            <Card style={{ alignItems: "center" }}>
              <Text weight="semibold">No calls here</Text>
              <Text tone="muted" size="sm" style={{ textAlign: "center" }}>
                You are all caught up. Switch tabs or sync new data.
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
