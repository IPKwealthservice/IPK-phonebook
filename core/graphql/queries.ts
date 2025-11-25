import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query MeProfile {
    me {
      id
      name
      email
      phone
      gender
      role
    }
  }
`;

export const ACTIVE_RMS = gql`
  query ActiveRms {
    activeRms {
      id
      name
      email
      phone
    }
  }
`;

export const STAGE_SUMMARY_QUERY = gql`
  query StageSummary {
    leadStageSummary {
      total
      items { stage count }
    }
  }
`;

export const LEADS_BY_STAGE_QUERY = gql`
  query LeadsByStage($stage: ClientStage, $args: LeadListArgs) {
    leadsByStage(stage: $stage, args: $args) {
      page
      pageSize
      total
      items {
        id
        leadCode
        name
        phone
        clientStage
        leadSource
        assignedRM
        assignedRmId
        status
      }
    }
  }
`;

export const LEADS_QUERY = gql`
  query Leads($args: LeadListArgs!) {
    leads(args: $args) {
      items {
        id
        leadCode
        name
        phone
        leadSource
        clientStage
        status
        assignedRM
        assignedRmId
        nextActionDueAt
      }
      page
      pageSize
      total
    }
  }
`;

export const LEAD_DETAIL_WITH_TIMELINE = gql`
  query LeadDetailWithTimeline($leadId: ID!, $eventsLimit: Int = 20) {
    leadDetailWithTimeline(leadId: $leadId, eventsLimit: $eventsLimit) {
      id
      leadCode
      status
      clientStage
      stageFilter
      name
      firstName
      lastName
      phone
      phones { id number normalized isPrimary isWhatsapp label }
      email
      location
      age
      gender
      product
      investmentRange
      sipAmount
      leadSource
      referralName
      remark
      bioText
      clientQa { question answer }
      nextActionDueAt
      createdAt
      updatedAt
      accountApps: accountApplicationsByLead {
        id
        applicationStatus
        kycStatus
        submittedAt
        reviewedAt
        approvedAt
        declinedAt
      }
      events {
        id
        type
        text
        occurredAt
        tags
      }
    }
  }
`;

// Minimal fallback for servers that don't implement the detail+timeline resolver
export const LEAD_BASIC = gql`
  query LeadBasic($id: ID!) {
    lead(id: $id) {
      id
      leadCode
      status
      clientStage
      stageFilter
      name
      phone
      email
      leadSource
      createdAt
      updatedAt
    }
  }
`;

export const MY_ASSIGNED_LEADS = gql`
  query MyAssignedLeads($page: Int!, $pageSize: Int!) {
    myAssignedLeads(args: { page: $page, pageSize: $pageSize }) {
      items {
        id
        leadCode
        name
        phone
        leadSource
        clientStage
        assignedRM
        assignedRmId
        nextActionDueAt
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_LEAD_DETAILS_AFTER_CALL = gql`
  mutation UpdateLeadDetailsAfterCall(
    $leadId: ID!
    $channel: InteractionChannel!
    $nextFollowUpAt: DateTime
    $note: String
    $productExplained: Boolean
    $stage: ClientStage!
    $stageFilter: LeadStageFilter
  ) {
    changeStage(
      input: {
        leadId: $leadId
        channel: $channel
        nextFollowUpAt: $nextFollowUpAt
        note: $note
        productExplained: $productExplained
        stage: $stage
        stageFilter: $stageFilter
      }
    ) {
      id
      firstName
      lastName
      phone
      email
      clientStage
      stageFilter
      nextActionDueAt
      updatedAt
    }
  }
`;

export const UPDATE_LEAD_REMARK = gql`
  mutation UpdateLeadRemark($leadId: ID!, $remark: String!) {
    updateLeadRemark(input: { leadId: $leadId, remark: $remark }) {
      id
      remark {
        at
        by
        byName
        text
      }
      updatedAt
    }
  }
`;

export const ADD_LEAD_INTERACTION = gql`
  mutation AddLeadInteraction($input: LeadInteractionInput!) {
    addLeadInteraction(input: $input) {
      id
      leadId
      occurredAt
      text
      tags
      type
    }
  }
`;

export const LOG_LEAD_CALL = gql`
  mutation LogLeadCall($input: LogLeadCallInput!) {
    logLeadCall(input: $input) {
      id
      leadId
      occurredAt
      text
      tags
      type
    }
  }
`;

export const UPDATE_LEAD_STATUS = gql`
  mutation UpdateLeadStatus($leadId: ID!, $status: LeadStatus!) {
    updateLeadStatus(leadId: $leadId, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

