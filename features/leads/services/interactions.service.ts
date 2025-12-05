import { apolloClient } from "@/core/graphql/apolloClient";
import {
  ADD_LEAD_INTERACTION,
  MARK_LEAD_CALL_MISSED,
  RECORD_LEAD_CALL,
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
  direction?: "INCOMING" | "OUTGOING";
  status?: "COMPLETED" | "PENDING" | "MISSED";
  failReason?: string | null;
  nextFollowUpAt?: string | null;
}): Promise<void> {
  const {
    leadId,
    phone,
    durationSeconds,
    notes,
    nextAction,
    occurredAt,
    outcome,
    direction,
    status,
    failReason,
    nextFollowUpAt,
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
    direction: (direction as any) ?? ("OUTGOING" as const),
    status: (status as any) ?? ("COMPLETED" as const),
    failReason: failReason ?? undefined,
    nextFollowUpAt: nextFollowUpAt ?? (nextAction?.trim() ? undefined : null),
    occurredAt: occurredAt ?? new Date().toISOString(),
  };

  await apolloClient.mutate({
    mutation: RECORD_LEAD_CALL,
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

export async function recordLeadCallLog(input: {
  leadId: string;
  phoneNumber: string;
  direction: "INCOMING" | "OUTGOING";
  status: "COMPLETED" | "PENDING" | "MISSED";
  durationSec?: number | null;
  failReason?: string | null;
  nextFollowUpAt?: string | null;
  occurredAt?: string | null;
}) {
  const payload: Record<string, unknown> = {
    leadId: input.leadId,
    phoneNumber: input.phoneNumber,
    direction: input.direction,
    status: input.status,
  };

  if (input.durationSec !== undefined) payload.durationSec = input.durationSec;
  if (input.failReason !== undefined) payload.failReason = input.failReason;
  if (input.nextFollowUpAt !== undefined) payload.nextFollowUpAt = input.nextFollowUpAt;
  if (input.occurredAt !== undefined) payload.occurredAt = input.occurredAt;

  const { data } = await apolloClient.mutate({
    mutation: RECORD_LEAD_CALL,
    variables: { input: payload },
  });

  return data?.recordLeadCall;
}

export async function markLeadCallAsMissed(input: {
  callLogId: string;
  failReason?: string | null;
  nextFollowUpAt?: string | null;
}) {
  const payload: Record<string, unknown> = {
    callLogId: input.callLogId,
  };
  if (input.failReason !== undefined) payload.failReason = input.failReason;
  if (input.nextFollowUpAt !== undefined) payload.nextFollowUpAt = input.nextFollowUpAt;

  const { data } = await apolloClient.mutate({
    mutation: MARK_LEAD_CALL_MISSED,
    variables: { input: payload },
  });

  return data?.markLeadCallMissed;
}
