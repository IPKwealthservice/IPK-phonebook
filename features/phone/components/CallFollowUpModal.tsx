// features/phone/components/CallFollowUpModal.tsx
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useCallMutations } from "../hooks/useCallMutations";

export type LeadSummary = { 
  id: string; 
  name?: string; 
  phone?: string; 
  clientStage?: string | null; 
  stageFilter?: string | null;
} | null;

export interface CallFollowUpModalProps {
  visible: boolean;
  durationSeconds: number;
  lead: LeadSummary;
  onClose: () => void;
}

type ClientStageOption =
  | "NEW_LEAD"
  | "FIRST_TALK_DONE"
  | "FOLLOWING_UP"
  | "CLIENT_INTERESTED"
  | "ACCOUNT_OPENED"
  | "NO_RESPONSE_DORMANT"
  | "NOT_INTERESTED_DORMANT"
  | "RISKY_CLIENT_DORMANT"
  | "HIBERNATED";

type LeadStageFilterOption =
  | "NEED_CLARIFICATION"
  | "FUTURE_INTERESTED"
  | "NOT_INTERESTED"
  | "NOT_ELIGIBLE"
  | "HIGH_PRIORITY"
  | "LOW_PRIORITY"
  | "ON_PROCESS";

const CLIENT_STAGE_OPTIONS: ClientStageOption[] = [
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

const LEAD_STAGE_FILTER_OPTIONS: (LeadStageFilterOption | null)[] = [
  null,
  "NEED_CLARIFICATION",
  "FUTURE_INTERESTED",
  "NOT_INTERESTED",
  "NOT_ELIGIBLE",
  "HIGH_PRIORITY",
  "LOW_PRIORITY",
  "ON_PROCESS",
];

function slugToLabel(stage?: string | null, fallback = "-") {
  if (!stage) return fallback;
  const s = stage.split("_");
  return s.map((x) => x.charAt(0) + x.slice(1).toLowerCase()).join(" ");
}

export default function CallFollowUpModal({
  visible,
  durationSeconds,
  lead,
  onClose,
}: CallFollowUpModalProps) {
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [selectedStage, setSelectedStage] = useState<ClientStageOption | null>(
    (lead?.clientStage as ClientStageOption) || null
  );
  const [selectedStageFilter, setSelectedStageFilter] = useState<LeadStageFilterOption | null>(
    (lead?.stageFilter as LeadStageFilterOption) || null
  );
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [stageFilterPickerOpen, setStageFilterPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const datePickerMountedRef = useRef(false);
  const { logCall, changeStage } = useCallMutations();

  // Reset date picker state when modal closes
  useEffect(() => {
    if (!visible) {
      setShowDatePicker(false);
      datePickerMountedRef.current = false;
    }
  }, [visible]);

  const durationLabel = useMemo(
    () => Math.max(1, Math.round(durationSeconds || 0)),
    [durationSeconds]
  );

  const handleSave = useCallback(async () => {
    if (!lead?.id) {
      Alert.alert("Call Follow-up", "Unable to log call: lead is missing.");
      return;
    }

    try {
      setSaving(true);

      // Save call log with duration and notes
      await logCall({
        leadId: lead.id,
        phone: lead?.phone ?? "",
        durationSeconds: durationLabel,
        notes,
        nextAction,
      });

      // Update lead stage and stage filter if changed
      if (selectedStage) {
        const nextFollowUpAt = nextFollowUpDate
          ? nextFollowUpDate.toISOString()
          : nextAction?.trim()
          ? undefined
          : null;

        await changeStage({
          leadId: lead.id,
          channel: "CALL",
          stage: selectedStage,
          stageFilter: selectedStageFilter ?? null,
          note: notes?.trim() || undefined,
          nextFollowUpAt: nextFollowUpAt ?? (nextAction?.trim() ? undefined : null),
          durationSeconds: durationLabel,
          saveRemark: true,
        });
      } else if (selectedStageFilter) {
        // If only stage filter changed, still update it
        await changeStage({
          leadId: lead.id,
          channel: "CALL",
          stage: lead?.clientStage as ClientStageOption || "CLIENT_INTERESTED",
          stageFilter: selectedStageFilter,
          note: notes?.trim() || undefined,
          durationSeconds: durationLabel,
          saveRemark: true,
        });
      }

      onClose();
      setNotes("");
      setNextAction("");
      setSelectedStage(null);
      setSelectedStageFilter(null);
      setNextFollowUpDate(null);
    } catch (err) {
      console.error("Call follow-up save failed", err);
      Alert.alert("Call Follow-up", "Failed to save follow-up. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    durationLabel,
    lead,
    logCall,
    changeStage,
    nextAction,
    notes,
    onClose,
    selectedStage,
    selectedStageFilter,
    nextFollowUpDate,
  ]);

  const leadLine = lead?.name || lead?.phone ? `${lead?.name ?? ""}${lead?.name && lead?.phone ? " • " : ""}${lead?.phone ?? ""}` : null;

  const handleDateChange = useCallback((event: any, date?: Date) => {
    // On Android, the picker dismisses automatically, so we need to close it
    if (Platform.OS === "android") {
      // Use a small delay to ensure the native picker has finished dismissing
      setTimeout(() => {
        setShowDatePicker(false);
        datePickerMountedRef.current = false;
      }, 100);
    }
    
    if (event.type === "set" && date) {
      setNextFollowUpDate(date);
    } else if (event.type === "dismissed") {
      setShowDatePicker(false);
      datePickerMountedRef.current = false;
    }
  }, []);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { /* blocking via BackHandler in screen */ }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
          style={styles.overlay}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Call Follow-up</Text>
            {leadLine ? <Text style={styles.subtitle}>{leadLine}</Text> : null}
            <Text style={styles.duration}>Call duration: {durationLabel} sec</Text>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.field}>
                <Text style={styles.label}>Lead Stage</Text>
                <Pressable
                  onPress={() => setStagePickerOpen(true)}
                  style={styles.dropdownButton}
                >
                  <Text style={styles.dropdownText}>
                    {selectedStage ? slugToLabel(selectedStage) : "Select stage"}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#CBD5E1" />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Status Filter</Text>
                <Pressable
                  onPress={() => setStageFilterPickerOpen(true)}
                  style={styles.dropdownButton}
                >
                  <Text style={styles.dropdownText}>
                    {selectedStageFilter ? slugToLabel(selectedStageFilter) : "Select status filter"}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#CBD5E1" />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Next Follow-up</Text>
                <Pressable
                  onPress={() => {
                    if (Platform.OS === "android") {
                      datePickerMountedRef.current = true;
                    }
                    setShowDatePicker(true);
                  }}
                  style={styles.dropdownButton}
                >
                  <Text style={styles.dropdownText}>
                    {nextFollowUpDate
                      ? nextFollowUpDate.toLocaleString()
                      : "Select date & time"}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#CBD5E1" />
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notes / Summary</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add context, commitments, objections, etc."
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={[styles.input, styles.multiline]}
                />
              </View>

              {/* <View style={styles.field}>
                <Text style={styles.label}>Next action</Text>
                <TextInput
                  value={nextAction}
                  onChangeText={setNextAction}
                  placeholder="e.g., Follow up on 18 Nov, send WhatsApp"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View> */}
            </ScrollView>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryBtn,
                saving ? { opacity: 0.6 } : undefined,
                pressed ? { opacity: 0.9 } : undefined,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save & Continue"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stage Picker Modal */}
      <Modal
        visible={stagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStagePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setStagePickerOpen(false)} />
          <View style={styles.optionCard}>
            <Text style={styles.optionCardTitle}>Select Lead Stage</Text>
            {CLIENT_STAGE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setSelectedStage(option);
                  setStagePickerOpen(false);
                }}
                style={styles.optionRow}
              >
                <Text style={styles.optionRowText}>{slugToLabel(option)}</Text>
                {selectedStage === option ? (
                  <MaterialIcons name="check" size={20} color="#4F46E5" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Stage Filter Picker Modal */}
      <Modal
        visible={stageFilterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStageFilterPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setStageFilterPickerOpen(false)} />
          <View style={styles.optionCard}>
            <Text style={styles.optionCardTitle}>Select Status Filter</Text>
            {LEAD_STAGE_FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option ?? "none"}
                onPress={() => {
                  setSelectedStageFilter(option);
                  setStageFilterPickerOpen(false);
                }}
                style={styles.optionRow}
              >
                <Text style={styles.optionRowText}>
                  {option ? slugToLabel(option) : "Not set"}
                </Text>
                {selectedStageFilter === option ? (
                  <MaterialIcons name="check" size={20} color="#4F46E5" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* DateTime Picker - Android - Render only when needed and visible */}
      {Platform.OS === "android" && showDatePicker && datePickerMountedRef.current && (
        <DateTimePicker
          value={nextFollowUpDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* DateTime Picker - iOS */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowDatePicker(false)} />
            <View style={styles.datePickerCard}>
              <View style={styles.datePickerHeader}>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.datePickerTitle}>Select Date & Time</Text>
                <Pressable
                  onPress={() => {
                    if (nextFollowUpDate) {
                      setShowDatePicker(false);
                    }
                  }}
                >
                  <Text style={[styles.datePickerDone, !nextFollowUpDate && { opacity: 0.5 }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={nextFollowUpDate || new Date()}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                style={styles.datePickerIOS}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    borderRadius: 16,
    backgroundColor: "#0F172A",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#334155",
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  subtitle: {
    marginTop: 4,
    color: "#CBD5E1",
  },
  duration: {
    marginTop: 8,
    color: "#CBD5E1",
  },
  field: {
    marginTop: 14,
  },
  label: {
    marginBottom: 6,
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F8FAFC",
    backgroundColor: "#0B1220",
  },
  multiline: {
    height: 96,
    textAlignVertical: "top",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#0B1220",
  },
  dropdownText: {
    color: "#F8FAFC",
    fontSize: 14,
    flex: 1,
  },
  primaryBtn: {
    marginTop: 18,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  optionCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#334155",
  },
  optionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  optionRowText: {
    color: "#F8FAFC",
    fontSize: 14,
    flex: 1,
  },
  datePickerCard: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#334155",
  },
  datePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#334155",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  datePickerCancel: {
    color: "#94A3B8",
    fontSize: 16,
  },
  datePickerDone: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerIOS: {
    height: 200,
    backgroundColor: "#0F172A",
  },
});
