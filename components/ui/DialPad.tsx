import { useTheme } from "@/core/theme/ThemeProvider";
import { useQuery } from "@apollo/client/react";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import { IpkLead } from "@/features/leads/data/ipkLeadModel";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MY_ASSIGNED_LEADS } from "@/core/graphql/queries";
import { fetchRecentCalls } from "@/core/phone/callEvents";
import {
  dpStyles,
  getActionIconSizeStyles,
  getCallButtonSizeStyles,
  getKeyHintSizeStyles,
  getKeyLabelSizeStyles,
  getKeySizeStyles,
} from "./dialpad.styles";

const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const KEY_HINTS: Record<string, string | undefined> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
  "0": "+",
};

const DEFAULT_COUNTRY_CODE = "";

const sanitizeNumber = (input: string = "") =>
  input.replace(/[^\d+]/g, "");

const ensureCountryCode = (raw: string) => raw ?? "";

type RecentCall = {
  id: string;
  number: string;
  timestamp: number;
};

const formatRecentTime = (timestamp: number) => {
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

type DialPadProps = {
  visible: boolean;
  onClose: () => void;
  onCall?: (number: string) => void;
  initialNumber?: string;
  onNumberChange?: (number: string) => void;
};

export const DialPad: React.FC<DialPadProps> = ({
  visible,
  onClose,
  onCall,
  initialNumber = "",
  onNumberChange,
}) => {
  const theme = useTheme();
  const { contacts } = useContacts();
  const { data: leadData } = useQuery(MY_ASSIGNED_LEADS, {
    variables: { page: 1, pageSize: 500 },
    fetchPolicy: "cache-and-network",
  });
  const ipkLeads = useMemo(() => {
    const items = (leadData as any)?.myAssignedLeads?.items ?? [];
    return items.map((lead: any) => ({
      ...lead,
      id: String(lead.id),
      name: lead.name ?? lead.leadCode ?? "Unknown lead",
      phone: lead.phone ?? "",
      phoneNormalized: sanitizeNumber(lead.phone ?? ""),
      leadSource: lead.leadSource ?? "Unknown",
      phones: lead.phone
        ? [{ label: "Primary", number: lead.phone, primary: true }]
        : [],
    })) as IpkLead[];
  }, [leadData]);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDark = theme.scheme === "dark";

  const [value, setValue] = useState(
    initialNumber ? ensureCountryCode(initialNumber) : DEFAULT_COUNTRY_CODE
  );
  const [search, setSearch] = useState("");
  const [leadSheetOpen, setLeadSheetOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<IpkLead | null>(
    ipkLeads[0] ?? null
  );
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);
  const anim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  useEffect(() => {
    setValue(
      initialNumber ? ensureCountryCode(initialNumber) : DEFAULT_COUNTRY_CODE
    );
  }, [initialNumber]);

  useEffect(() => {
    if (!activeLead && ipkLeads.length) {
      setActiveLead(ipkLeads[0]);
    }
  }, [activeLead, ipkLeads]);

  useEffect(() => {
    let cancelled = false;
    const loadRecentCalls = async () => {
      if (!visible || Platform.OS !== "android") {
        setRecentCalls([]);
        return;
      }
      setLoadingRecents(true);
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
        );
        if (!hasPermission) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setRecentCalls([]);
            return;
          }
        }

        const entries = await fetchRecentCalls(30);
        const mapped = entries.map((entry, index) => {
          const digits = sanitizeNumber(entry?.number ?? "");
          const ts =
            typeof entry?.timestamp === "number" && entry.timestamp > 0
              ? entry.timestamp
              : Date.now();
          return {
            id: String(entry?.timestamp ?? `${ts}-${index}`),
            number: digits,
            timestamp: ts,
          } as RecentCall;
        });

        if (!cancelled) {
          setRecentCalls(mapped);
        }
      } catch (error) {
        console.warn("Failed to load recent calls", error);
        if (!cancelled) {
          setRecentCalls([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRecents(false);
        }
      }
    };
    loadRecentCalls();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const pointerEvents = visible ? "auto" : "none";
  const numberDisplay = useMemo(() => {
    const digits = String(value || "").replace(/\D+/g, "");
    if (!digits) return "Enter Number";
    return digits.replace(/(.{3})/g, "$1 ").trim();
  }, [value]);

  const callerIdentity = contacts?.[0];
  const normalizedDial = useMemo(() => sanitizeNumber(value), [value]);
  const matchedLead = useMemo(() => {
    if (!normalizedDial) return null;
    const digitsOnly = normalizedDial.replace(/\D+/g, "");
    if (digitsOnly.length < 5) return null;
    return (
      ipkLeads.find((lead) => {
        const normalizedLeadPhone = sanitizeNumber(lead.phone).replace(/\D+/g, "");
        return (
          normalizedLeadPhone.startsWith(digitsOnly) ||
          normalizedLeadPhone.includes(digitsOnly)
        );
      }) ?? null
    );
  }, [ipkLeads, normalizedDial]);

  useEffect(() => {
    if (matchedLead && matchedLead.id !== activeLead?.id) {
      setActiveLead(matchedLead);
    }
  }, [matchedLead, activeLead?.id]);

  const currentLead = matchedLead ?? activeLead;
  const callAsDisplayName =
    currentLead?.name ?? callerIdentity?.displayName ?? "Primary line";
  const callAsDisplayPhone =
    currentLead?.phone ?? callerIdentity?.phone ?? "Select a lead";

  const filteredLeads = useMemo(() => {
    const searchText = (search || "").trim().toLowerCase();
    const searchDigits = (search || "").replace(/[^\d]/g, "");
    const dialDigits = (normalizedDial || "").replace(/[^\d]/g, "");
    const effectiveDialDigits = dialDigits.length >= 3 ? dialDigits : "";

    const hasTextQuery = searchText.length >= 2;
    const hasDigitQuery = searchDigits.length >= 3 || effectiveDialDigits.length >= 3;

    if (!hasTextQuery && !hasDigitQuery) return [];

    const digits = searchDigits.length >= 3 ? searchDigits : effectiveDialDigits;

    return ipkLeads
      .filter((lead) => {
        const phoneNorm = (lead.phoneNormalized || sanitizeNumber(lead.phone)).replace(/[^\d]/g, "");
        const name = (lead.name || "").toLowerCase();
        const leadCode = (lead.leadCode || "").toLowerCase();
        const numberMatch = digits ? phoneNorm.startsWith(digits) : false;
        const nameMatch = hasTextQuery ? name.includes(searchText) : false;
        const codeMatch = hasTextQuery ? leadCode.includes(searchText) : false;
        return numberMatch || nameMatch || codeMatch;
      })
      .slice(0, 20);
  }, [ipkLeads, normalizedDial, search]);

  const updateValue = (next: string) => {
    const ensured = ensureCountryCode(next);
    setValue(ensured);
    onNumberChange?.(ensured);
  };

  const handleDigit = (digit: string) => {
    if (!visible) return;
    updateValue((value + digit).slice(0, 32));
  };

  const handleBackspace = () => {
    if (!visible || !value.length) return;
    updateValue(value.slice(0, -1));
  };

  const handleCall = () => {
    const raw = value.trim();
    if (!raw) return;
    const digits = raw.replace(/\D+/g, "");
    const isInternational = raw.startsWith("+");
    const toDial = !isInternational && digits.length === 10 ? `+91${digits}` : raw;
    onCall?.(toDial);
  };

  const handleSelectLead = (lead: IpkLead) => {
    if (lead?.phone) {
      updateValue(lead.phone);
    }
    setSearch("");
    setActiveLead(lead);
    setLeadSheetOpen(true);
  };

  const handleLeadPick = (lead: IpkLead) => {
    setActiveLead(lead);
    if (lead.phone) {
      updateValue(lead.phone);
    }
    setLeadSheetOpen(false);
  };

  return (
    <>
      <Animated.View
        pointerEvents={pointerEvents}
        style={[
          StyleSheet.absoluteFill,
          dpStyles.overlayLayer,
          {
            opacity: anim,
            backgroundColor: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(0,0,0,0)", "rgba(15,23,42,0.55)"],
            }) as any,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              paddingTop: Math.max(12, insets.top + 8),
              paddingBottom: Math.max(16, 12 + insets.bottom),
            },
          ]}
        >
          <View style={styles.contentContainer}>
            <View style={styles.topSection}>
              <View style={styles.topFixed}>
                <View
                  style={[
                    styles.searchField,
                    {
                      backgroundColor: isDark ? "#111827" : "#F3F4F6",
                      borderWidth: 1,
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    },
                  ]}
                >
                  <MaterialIcons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    placeholder="Search leads or dial number"
                    placeholderTextColor={isDark ? "#94A3B8" : "#9BA1A6"}
                    value={search}
                    onChangeText={setSearch}
                    style={[
                      styles.searchInput,
                      { color: isDark ? "#F8FAFC" : "#111827" },
                    ]}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <MaterialIcons name="close" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.callAsRow,
                    {
                      backgroundColor: isDark ? "#111826" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    },
                  ]}
                  onPress={() => setLeadSheetOpen(true)}
                >
                  <Text
                    style={[
                      styles.callAsLabel,
                      { color: isDark ? "#94A3B8" : "#6B7280" },
                    ]}
                  >
                    Call as
                  </Text>
                  <View style={styles.callAsContent}>
                    <Text
                      style={[
                        styles.callAsName,
                        { color: isDark ? "#F8FAFC" : "#111827" },
                      ]}
                    >
                      {callAsDisplayName}
                    </Text>
                    <Text
                      style={[
                        styles.callAsPhone,
                        { color: isDark ? "#CBD5F5" : "#6B7280" },
                      ]}
                    >
                      {callAsDisplayPhone}
                    </Text>
                  </View>
                  <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={styles.numberWrapper}>
                <View style={[styles.numberDisplay, dpStyles.numberContainer]}>
                  <Text
                    style={[
                      styles.numberText,
                      dpStyles.numberTextFit,
                      { color: isDark ? "#F8FAFC" : "#111827" },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    allowFontScaling
                  >
                    {numberDisplay}
                  </Text>
                </View>
              </View>

              {filteredLeads.length > 0 ? (
                <ScrollView
                  style={styles.suggestionsList}
                  contentContainerStyle={styles.suggestionsContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {filteredLeads.map((lead) => (
                    <TouchableOpacity
                      key={lead.id}
                      style={styles.resultRow}
                      activeOpacity={0.85}
                      onPress={() => handleSelectLead(lead)}
                    >
                      <View
                        style={[
                          styles.resultAvatar,
                          {
                            backgroundColor: isDark
                              ? "rgba(99,102,241,0.25)"
                              : "#EEF2FF",
                          },
                        ]}
                      >
                        <Text style={styles.resultAvatarText}>
                          {(lead.name || "?")
                            .split(" ")
                            .map((c) => c.charAt(0))
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.resultName,
                            { color: isDark ? "#F8FAFC" : "#111827" },
                          ]}
                          numberOfLines={1}
                        >
                          {lead.name || "Unknown"}
                        </Text>
                        <Text
                          style={[
                            styles.resultPhone,
                            { color: isDark ? "#94A3B8" : "#6B7280" },
                          ]}
                          numberOfLines={1}
                        >
                          {lead.phone}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.recentsContainer}>
                  <View style={styles.recentsHeader}>
                    <Text
                      style={[
                        styles.recentsTitle,
                        { color: isDark ? "#CBD5F5" : "#0F172A" },
                      ]}
                    >
                      Recent calls
                    </Text>
                    {loadingRecents ? (
                      <Text style={styles.recentsSubtitle}>Loading...</Text>
                    ) : null}
                  </View>
                  <ScrollView
                    style={styles.recentsList}
                    contentContainerStyle={styles.recentsContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {recentCalls.length === 0 && !loadingRecents ? (
                      <Text style={styles.recentsSubtitle}>
                        No recent calls found
                      </Text>
                    ) : null}
                    {recentCalls.map((call) => (
                      <TouchableOpacity
                        key={call.id}
                        style={[
                          styles.recentRow,
                          {
                            backgroundColor: isDark ? "#0B1226" : "#F8FAFC",
                            borderColor: isDark ? "#1F2937" : "#E5E7EB",
                          },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => updateValue(call.number)}
                      >
                        <Text
                          style={[
                            styles.recentNumber,
                            { color: isDark ? "#F8FAFC" : "#111827" },
                          ]}
                          numberOfLines={1}
                        >
                          {call.number}
                        </Text>
                        <Text style={styles.recentTime}>
                          {formatRecentTime(call.timestamp)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.padSection}>
              <View style={styles.padGrid}>
                {KEY_ROWS.map((row) => (
                  <View key={row.join("-")} style={styles.row}>
                    {row.map((digit) => (
                      <TouchableOpacity
                        key={digit}
                        style={[
                          styles.key,
                          {
                            backgroundColor: isDark ? "#111827" : "#FFFFFF",
                            borderColor: isDark ? "#1F2937" : "#E5E7EB",
                          },
                          getKeySizeStyles(screenWidth),
                        ]}
                        activeOpacity={0.85}
                        onPress={() => handleDigit(digit)}
                      >
                        <Text
                          style={[
                            styles.keyLabel,
                            getKeyLabelSizeStyles(screenWidth),
                            { color: isDark ? "#F8FAFC" : "#111827" },
                          ]}
                        >
                          {digit}
                        </Text>
                        {KEY_HINTS[digit] && (
                          <Text
                            style={[
                              styles.keyHint,
                              getKeyHintSizeStyles(screenWidth),
                              { color: isDark ? "#94A3B8" : "#6B7280" },
                            ]}
                          >
                            {KEY_HINTS[digit]}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: isDark ? "#111827" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    },
                    getActionIconSizeStyles(screenWidth),
                    { opacity: value.length ? 1 : 0.4 },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleBackspace}
                  disabled={!value.length}
                >
                  <MaterialIcons
                    name="backspace"
                    size={22}
                    color={isDark ? "#F8FAFC" : "#111827"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.callButton,
                    getCallButtonSizeStyles(screenWidth),
                    { opacity: value.length ? 1 : 0.5 },
                  ]}
                  activeOpacity={0.8}
                  onPress={handleCall}
                  disabled={!value.length}
                >
                  <MaterialIcons name="call" size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: isDark ? "#111827" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                    },
                    getActionIconSizeStyles(screenWidth),
                  ]}
                  activeOpacity={0.8}
                  onPress={onClose}
                >
                  <MaterialIcons
                    name="dialpad"
                    size={22}
                    color={isDark ? "#F8FAFC" : "#111827"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
      <LeadDetailsModal
        visible={leadSheetOpen}
        onClose={() => setLeadSheetOpen(false)}
        leads={ipkLeads}
        activeLead={activeLead}
        onSelect={handleLeadPick}
      />
    </>
  );
};

type LeadDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  leads: IpkLead[];
  activeLead: IpkLead | null;
  onSelect: (lead: IpkLead) => void;
};

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  visible,
  onClose,
  leads,
  activeLead,
  onSelect,
}) => {
  const activeIndex = Math.max(
    0,
    leads.findIndex((lead) => lead.id === activeLead?.id)
  );

  const handleNavigate = (direction: "prev" | "next") => {
    if (!leads.length) return;
    const nextIndex =
      direction === "prev"
        ? Math.max(0, activeIndex - 1)
        : Math.min(leads.length - 1, activeIndex + 1);
    if (nextIndex !== activeIndex) {
      onSelect(leads[nextIndex]);
    }
  };

  const phones =
    activeLead?.phones
      ?.map((phone) => `${phone.label}: ${phone.number}`)
      .join(" / ") ?? activeLead?.phone;

  const infoPairs = [
    { label: "Lead Code", value: activeLead?.leadCode },
    { label: "Lead Source", value: activeLead?.leadSource },
    { label: "Status", value: activeLead?.status },
    { label: "Client Stage", value: activeLead?.clientStage },
    { label: "Assigned RM", value: activeLead?.assignedRM },
    { label: "Company", value: activeLead?.companyName },
    { label: "Designation", value: activeLead?.designation },
    { label: "Profession", value: activeLead?.profession },
    { label: "Investment Range", value: activeLead?.investmentRange },
    {
      label: "SIP Amount",
      value: activeLead?.sipAmount ? `Rs ${activeLead.sipAmount}` : undefined,
    },
    { label: "Last Contacted", value: activeLead?.lastContactedAt },
    { label: "Next Action", value: activeLead?.nextActionDueAt },
    { label: "Remark", value: activeLead?.remark },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalWrapper}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalPanel}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={[styles.navButton, activeIndex <= 0 && styles.navButtonDisabled]}
              disabled={activeIndex <= 0}
              onPress={() => handleNavigate("prev")}
            >
              <MaterialIcons name="chevron-left" size={20} color="#4C1D95" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.modalTitle}>Lead identity</Text>
              <Text style={styles.modalSubtitle}>
                {activeLead?.leadCode ?? activeLead?.id}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.navButton, activeIndex >= leads.length - 1 && styles.navButtonDisabled]}
              disabled={activeIndex >= leads.length - 1}
              onPress={() => handleNavigate("next")}
            >
              <MaterialIcons name="chevron-right" size={20} color="#4C1D95" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {activeLead ? (
              <View style={styles.modalDetails}>
                <Text style={styles.modalSectionTitle}>Model: IpkLead</Text>
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeText}>ipkModule</Text>
                </View>
                <InfoRow label="Full Name" value={activeLead.name} />
                <InfoRow label="Phones" value={phones} />
                {infoPairs.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyDetails}>
                <Text style={styles.emptyTitle}>No lead selected</Text>
                <Text style={styles.emptyBody}>
                  Choose a lead from the pipeline to view their model details.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

type InfoRowProps = {
  label: string;
  value?: string | number | null;
};

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value ?? "N/A"}</Text>
  </View>
);

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flex: 1,
    paddingHorizontal: 22,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
    gap: 24,
  },
  topSection: {
    flexShrink: 1,
    gap: 16,
  },
  topFixed: {
    width: "100%",
    gap: 12,
  },
  numberWrapper: {
    alignItems: "center",
  },
  recentsContainer: {
    width: "100%",
    gap: 8,
  },
  recentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  recentsTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  recentsSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
  },
  recentsList: {
    maxHeight: 240,
    width: "100%",
  },
  recentsContent: {
    gap: 8,
    paddingBottom: 4,
  },
  recentRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  recentNumber: {
    fontSize: 15,
    fontWeight: "600",
  },
  recentTime: {
    marginTop: 4,
    fontSize: 12,
    color: "#94A3B8",
  },
  suggestionsList: {
    maxHeight: 240,
    width: "100%",
  },
  suggestionsContent: {
    gap: 8,
    paddingBottom: 4,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  callAsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  callAsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 10,
  },
  callAsContent: {
    flex: 1,
  },
  callAsName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  callAsPhone: {
    fontSize: 13,
    color: "#6B7280",
  },
  numberDisplay: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
  },
  numberText: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: 1,
    fontFamily: "poppins-bold",
    color: "#111827",
  },
  padSection: {
    gap: 20,
    alignItems: "center",
  },
  padGrid: {
    gap: 12,
    alignSelf: "stretch",
    maxWidth: 360,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  key: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  keyLabel: {
    fontSize: 28,
    fontWeight: "600",
  },
  keyHint: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 2,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    width: "100%",
    maxWidth: 360,
  },
  actionIcon: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  callButton: {
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    width: "100%",
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  resultAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600",
  },
  resultPhone: {
    marginTop: 2,
    fontSize: 13,
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalScroll: {
    paddingBottom: 20,
    gap: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  closeChip: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },
  closeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  modalDetails: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    gap: 10,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4C1D95",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#DDD6FE",
    marginBottom: 6,
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4C1D95",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    flex: 0.45,
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    flex: 0.55,
    textAlign: "right",
  },
  emptyDetails: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  emptyBody: {
  fontSize: 13,
  color: "#475569",
  textAlign: "center",
  },
});

export default DialPad;
