import { apolloClient } from "@/core/graphql/apolloClient";
import {
  ADD_LEAD_INTERACTION,
  LOG_LEAD_CALL,
  UPDATE_LEAD_DETAILS_AFTER_CALL,
  UPDATE_LEAD_REMARK,
  UPDATE_LEAD_STATUS,
} from "@/core/graphql/queries";

export type InteractionChannel = "CALL" | "WHATSAPP" | "EMAIL" | "SMS" | "OTHER";

export async function updateLeadAfterCall(params: {
  leadId: string;
  channel: InteractionChannel;
  note?: string | null;
  productExplained?: boolean;
  nextFollowUpAt?: string | null;
  stage?: string; // ClientStage, defaults to CLIENT_INTERESTED
  stageFilter?: string | null;
  callStartedAt?: string | null;
  callEndedAt?: string | null;
  durationSeconds?: number | null;
  saveRemark?: boolean;
}) {
  const {
    leadId,
    channel,
    note,
    productExplained,
    nextFollowUpAt,
    stage,
    stageFilter,
    callStartedAt,
    callEndedAt,
    durationSeconds,
    saveRemark,
  } = params;

  const segments: string[] = [];
  const trimmedNote = note?.trim();
  if (trimmedNote) {
    segments.push(trimmedNote);
  }
  if (callStartedAt) {
    segments.push(`Call started at ${callStartedAt}`);
  }
  if (callEndedAt) {
    segments.push(`Call ended at ${callEndedAt}`);
  }
  if (Number.isFinite(durationSeconds ?? NaN)) {
    const seconds = Math.max(1, Math.round((durationSeconds ?? 0) || 0));
    segments.push(`Call duration ${seconds}s`);
  }

  const finalNote = segments.length ? segments.join(" | ") : undefined;

  const variables: Record<string, unknown> = {
    leadId,
    channel,
    stage: (stage as any) ?? "CLIENT_INTERESTED",
  };

  if (nextFollowUpAt !== undefined) {
    variables.nextFollowUpAt = nextFollowUpAt ?? null;
  }
  if (finalNote !== undefined) {
    variables.note = finalNote;
  }
  if (productExplained !== undefined) {
    variables.productExplained = productExplained;
  }
  if (stageFilter !== undefined) {
    variables.stageFilter = stageFilter ?? null;
  }

  const { data } = await apolloClient.mutate({
    mutation: UPDATE_LEAD_DETAILS_AFTER_CALL,
    variables,
  });

  if (saveRemark && finalNote) {
    await apolloClient.mutate({
      mutation: UPDATE_LEAD_REMARK,
      variables: { leadId, remark: finalNote },
    });
  }

  return data?.changeStage;
}

export async function logCallInteraction(input: {
  leadId?: string;
  phone: string;
  durationSeconds: number;
  notes: string;
  nextAction: string;
  occurredAt?: string;
  outcome?: string;
}): Promise<void> {
  const {
    leadId,
    phone,
    durationSeconds,
    notes,
    nextAction,
    occurredAt,
    outcome,
  } = input;
  if (!leadId) {
    console.warn("Skipping lead interaction: leadId missing");
    return;
  }

  const normalizedPhone = phone?.replace(/\s+/g, "").trim();
  const sanitizedPhone = normalizedPhone || phone?.trim();
  if (!sanitizedPhone) {
    console.warn("Skipping call log: phone number missing");
    return;
  }
  const segments = [
    notes?.trim(),
    nextAction?.trim() ? `Next: ${nextAction.trim()}` : undefined,
    sanitizedPhone ? `Number: ${sanitizedPhone}` : undefined,
    Number.isFinite(durationSeconds)
      ? `Duration: ${Math.max(1, Math.round(durationSeconds))}s`
      : undefined,
  ].filter((part): part is string => Boolean(part));
  const text = segments.join(" | ") || "Call follow-up";

  const duration = Math.max(1, Math.round(durationSeconds || 0));
  const logPayload = {
    leadId,
    phoneNumber: sanitizedPhone,
    durationSec: duration,
    direction: "OUTGOING" as const,
    text,
    occurredAt: occurredAt ?? new Date().toISOString(),
    outcome:
      (outcome as any) ??
      (nextAction?.trim() ? "FOLLOW_UP_NEEDED" : "ANSWERED"),
  };

  await apolloClient.mutate({
    mutation: LOG_LEAD_CALL,
    variables: { input: logPayload },
  });

  await apolloClient.mutate({
    mutation: ADD_LEAD_INTERACTION,
    variables: {
      input: {
        leadId,
        channel: "CALL",
        text,
        tags: ["call", "follow-up"],
      },
    },
  });
}

export async function updateLeadStatus(params: {
  leadId: string;
  status: string;
}) {
  const { leadId, status } = params;

  const { data } = await apolloClient.mutate({
    mutation: UPDATE_LEAD_STATUS,
    variables: {
      leadId,
      status: status as any,
    },
  });

  return data?.updateLeadStatus;
}
