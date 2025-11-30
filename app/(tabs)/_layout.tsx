import { MaterialIcons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { toast } from "@/components/feedback/Toast";
import { DialPad } from "@/components/ui/DialPad";
import { FloatingAssistiveBall } from "@/components/ui/FloatingAssistiveBall";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/core/theme/ThemeProvider";
import { placeDirectCall } from "@/core/utils/directCall";
import { formatPhone } from "@/core/utils/format";
import { ipkLeadPipeline } from "@/features/leads/data/ipkLeadModel";
import { useCallStore } from "@/features/phone/store/call.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const [dialOpen, setDialOpen] = useState(false);
  const activeCall = useCallStore((state) => state.activeCall);
  const startCall = useCallStore((state) => state.startCall);
  const endCall = useCallStore((state) => state.endCall);

  const [callShowcase, setCallShowcase] = useState(false);
  const [callNotes, setCallNotes] = useState("");
  const [callTimer, setCallTimer] = useState("00:00");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);

  const normalizeNumber = (value: string) =>
    value.replace(/[\s\-\(\)]/g, "");

  const matchedLead = useMemo(() => {
    if (!activeCall) return null;
    const normalized = activeCall.normalized;
    return (
      ipkLeadPipeline.find(
        (lead) => normalizeNumber(lead.phone) === normalized
      ) ?? null
    );
  }, [activeCall]);

  const handleCall = async (num: string) => {
    const number = num.replace(/\s+/g, "");
    if (!number) {
      toast("Enter a number");
      return;
    }

    // Track call state locally and trigger native dialer immediately
    startCall(num);
    const success = await placeDirectCall(number);
    if (!success) {
      endCall();
      toast("Unable to start call");
      return;
    }
    setDialOpen(false);
  };

  useEffect(() => {
    if (!activeCall) {
      setCallShowcase(false);
      setCallNotes("");
      setCallTimer("00:00");
      setMuted(false);
      setSpeaker(false);
      setShowKeypad(false);
      return;
    }

    setCallShowcase(true);
    const startedAt = activeCall.startedAt;

    const updateTimer = () => {
      const elapsed = Date.now() - startedAt;
      const seconds = Math.floor(elapsed / 1000);
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
      setCallTimer(`${mins}:${secs}`);
    };

    updateTimer();
    const tick = setInterval(updateTimer, 1000);
    const hangup = setTimeout(() => endCall(), 1000 * 45);

    return () => {
      clearInterval(tick);
      clearTimeout(hangup);
    };
  }, [activeCall, endCall]);

  // --- Bottom tab bar sizing ---
  const tabBarInset = insets.bottom;
  const tabBarHeight = 52 + (tabBarInset || 0);

  const baseTabBarStyle = {
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: tabBarHeight,
    paddingTop: 0,
    paddingBottom: tabBarInset || 4,
    paddingHorizontal: 12,
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        sceneContainerStyle={{ backgroundColor: theme.colors.background }}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          tabBarStyle: baseTabBarStyle,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarItemStyle: { flex: 1 },
          tabBarLabelStyle: {
            marginTop: 0,
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        {/* Home tab */}
        <Tabs.Screen
          name="index"
          options={{
            title: "IPK-home",
            tabBarLabel: "IPK-home",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" color={color} size={size} />
            ),
          }}
        />

        {/* Follow-ups: NOT a tab, just a shortcut screen with back button */}
        <Tabs.Screen
          name="followups"
          options={{
            // not shown as a tab / deep link
            href: null,
            title: "Today's Follow-ups",
            headerShown: true,
            // hide the bottom tab bar on this screen
            tabBarStyle: { display: "none" },
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  marginLeft: 8,
                  borderRadius: 12,
                  backgroundColor:
                    theme.scheme === "dark"
                      ? "#111827"
                      : theme.colors.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={20}
                  color={theme.colors.text}
                />
              </Pressable>
            ),
          }}
        />

        {/* Leads tab */}
        <Tabs.Screen
          name="leads"
          options={{
            title: "Leads",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="list-alt" color={color} size={size} />
            ),
          }}
        />

        {/* Calls tab */}
        <Tabs.Screen
          name="calls"
          options={{
            title: "Calls",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="call" color={color} size={size} />
            ),
          }}
        />

        {/* Explore tab */}
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="auto-graph" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      {/* Assistive ball + DialPad overlay */}
      {!(pathname === "/(tabs)" || pathname === "/(tabs)/index" || pathname === "/") && (
        <FloatingAssistiveBall onPress={() => setDialOpen(true)} />
      )}
      <DialPad
        visible={dialOpen}
        onClose={() => setDialOpen(false)}
        onCall={handleCall}
      />

      {activeCall && callShowcase && (
        <View
          style={[
            styles.callOverlay,
            { paddingBottom: Math.max(30, 12 + insets.bottom) },
          ]}
        >
          <View style={styles.callOverlayDecorOne} />
          <View style={styles.callOverlayDecorTwo} />

          <View style={styles.callOverlayContent}>
            <View style={styles.overlayHeader}>
              <Pressable
                style={styles.overlayMiniButton}
                onPress={() => setCallShowcase(false)}
              >
                <MaterialIcons name="expand-more" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.overlayTimer}>{callTimer}</Text>
              <Pressable style={styles.overlayMiniButton} onPress={endCall}>
                <MaterialIcons name="call-end" size={18} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.leadAvatar}>
              {matchedLead ? (
                <Text style={styles.leadAvatarText}>
                  {matchedLead.name
                    .split(" ")
                    .map((chunk) => chunk[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Text>
              ) : (
                <MaterialIcons name="person" size={36} color="#E5E7EB" />
              )}
            </View>

            <Text style={styles.overlayName}>
              {matchedLead?.name ?? formatPhone(activeCall.dialed)}
            </Text>

            {!!matchedLead?.companyName && (
              <Text style={styles.overlayCompany}>
                {matchedLead.companyName}
              </Text>
            )}

            <Text style={styles.overlayNumber}>
              {formatPhone(activeCall.dialed)}
            </Text>

            <View style={styles.overlayActionsRow}>
              <CallActionButton
                icon="mic-off"
                label={muted ? "Muted" : "Mute"}
                active={muted}
                onPress={() => setMuted((prev) => !prev)}
              />
              <CallActionButton
                icon="dialpad"
                label="Keypad"
                active={showKeypad}
                onPress={() => setShowKeypad((prev) => !prev)}
              />
              <CallActionButton
                icon="volume-up"
                label={speaker ? "Speaker on" : "Speaker"}
                active={speaker}
                onPress={() => setSpeaker((prev) => !prev)}
              />
            </View>

            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Text
                  weight="semibold"
                  size="sm"
                  style={{ color: "#CBD5F5" }}
                >
                  Call notes
                </Text>
                <Text
                  size="sm"
                  style={{ color: "#94A3B8", fontSize: 12 }}
                >
                  {callNotes.length}/180
                </Text>
              </View>

              <TextInput
                value={callNotes}
                onChangeText={(txt) => setCallNotes(txt.slice(0, 180))}
                placeholder="Log quick follow-ups or action items..."
                placeholderTextColor="#64748B"
                style={styles.notesInput}
                multiline
              />
            </View>

            <Pressable style={styles.overlayEndCall} onPress={endCall}>
              <MaterialIcons name="call-end" size={24} color="#fff" />
              <Text weight="bold" style={styles.overlayEndLabel}>
                End Call
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {activeCall && !callShowcase && (
        <View
          style={[
            styles.callBanner,
            { bottom: Math.max(24, 12 + insets.bottom) },
          ]}
        >
          <View>
            <Text size="sm" tone="muted">
              Calling
            </Text>
            <Text weight="bold" size="lg">
              {formatPhone(activeCall.dialed)}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              style={[
                styles.endButton,
                { marginRight: 12, backgroundColor: "#16A34A" },
              ]}
              onPress={() => setCallShowcase(true)}
            >
              <MaterialIcons name="open-in-full" size={18} color="#fff" />
              <Text
                weight="bold"
                size="sm"
                style={{ color: "#fff", marginLeft: 6 }}
              >
                Expand
              </Text>
            </Pressable>

            <Pressable style={styles.endButton} onPress={endCall}>
              <MaterialIcons name="call-end" size={20} color="#fff" />
              <Text
                weight="bold"
                size="sm"
                style={{ color: "#fff", marginLeft: 6 }}
              >
                End
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

type CallActionProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

const CallActionButton = ({
  icon,
  label,
  active,
  onPress,
}: CallActionProps) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.actionButton,
      active && {
        backgroundColor: "rgba(255,255,255,0.16)",
        borderColor: "#fff",
      },
    ]}
  >
    <MaterialIcons
      name={icon}
      size={22}
      color={active ? "#fff" : "#CBD5F5"}
      style={{ marginBottom: 6 }}
    />
    <Text
      size="sm"
      style={{
        color: active ? "#fff" : "#94A3B8",
        textAlign: "center",
        fontSize: 12,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  callOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050818",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: "space-between",
  },
  callOverlayDecorOne: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#4C1D95",
    opacity: 0.25,
  },
  callOverlayDecorTwo: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#312E81",
    opacity: 0.35,
  },
  callOverlayContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  overlayHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overlayMiniButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayTimer: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  leadAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  leadAvatarText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
  },
  overlayName: {
    marginTop: 24,
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
  },
  overlayCompany: {
    marginTop: 4,
    color: "#C7D2FE",
    fontSize: 16,
  },
  overlayNumber: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 14,
  },
  overlayActionsRow: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  actionButton: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  notesCard: {
    width: "100%",
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
    backgroundColor: "rgba(15,23,42,0.7)",
    padding: 14,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 70,
    color: "#F8FAFC",
    fontSize: 14,
  },
  overlayEndCall: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "#DC2626",
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  overlayEndLabel: {
    marginLeft: 10,
    color: "#fff",
    fontSize: 16,
  },
  callBanner: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    borderRadius: 18,
    backgroundColor: "#111826",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
