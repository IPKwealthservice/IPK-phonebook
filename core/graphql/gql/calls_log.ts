import { gql } from "@apollo/client";

// Capture a missed incoming call against a lead so it shows in the missed call list.
export const RECORD_MISSED_INCOMING_LEAD_CALL = gql`
  mutation RecordMissedIncomingLeadCall(
    $leadId: ID!
    $phoneNumber: String!
    $failReason: CallFailReason
    $nextFollowUpAt: DateTime
  ) {
    recordLeadCall(
      input: {
        leadId: $leadId
        phoneNumber: $phoneNumber
        direction: INCOMING
        status: MISSED
        failReason: $failReason
        nextFollowUpAt: $nextFollowUpAt
      }
    ) {
      id
      leadId
      leadName
      leadCode
      phoneNumber
      direction
      status
      durationSec
      failReason
      occurredAt
      nextFollowUpAt
      createdByName
    }
  }
`;

// Fetch missed calls for a lead to render under the lead's call history section.
export const MISSED_LEAD_CALLS = gql`
  query MissedLeadCalls($leadId: ID, $limit: Int = 50) {
    missedLeadCalls(leadId: $leadId, limit: $limit) {
      id
      leadId
      leadName
      leadCode
      phoneNumber
      direction
      status
      occurredAt
      durationSec
      failReason
      nextFollowUpAt
      createdByName
    }
  }
`;

export const CALLS_TAB_QUERY = gql`
  query CallsTab($leadId: ID, $limit: Int) {
    pendingLeadCallLogs(leadId: $leadId, limit: $limit, includeMissed: true) {
      id
      leadId
      leadName
      leadCode
      phoneNumber
      direction
      status
      occurredAt
      durationSec
      failReason
      nextFollowUpAt
      createdByName
    }
    missedLeadCallsSummary(leadId: $leadId, limit: $limit) {
      total
      calls {
        id
        leadId
        leadName
        leadCode
        phoneNumber
        direction
        status
        occurredAt
        durationSec
        failReason
        nextFollowUpAt
        createdByName
      }
    }
  }
`;
