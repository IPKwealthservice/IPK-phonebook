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
        firstName
        lastName
        phone
        clientStage
        stageFilter
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
        firstName
        lastName
        phone
        phoneNormalized
        phones {
          number
          normalized
          isPrimary
          label
        }
        leadSource
        clientStage
        stageFilter
        status
        assignedRM
        assignedRmId
        nextActionDueAt
        createdAt
        updatedAt
        lastContactedAt
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
        firstName
        lastName
        phone
        phoneNormalized
        phones {
          number
          normalized
          isPrimary
          label
        }
        leadSource
        clientStage
        stageFilter
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

export const UPDATE_LEAD_DETAILS = gql`
  mutation UpdateLeadDetails($input: UpdateLeadDetailsInput!) {
    updateLeadDetails(input: $input) {
      id
      clientCode
      clientStage
      stageFilter
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

// Record a call log (completed, pending, or missed) against a lead.
// Legacy alias removed; use LOG_LEAD_CALL above for creating call logs.

export const UPDATE_LEAD_STATUS = gql`
  mutation UpdateLeadStatus($leadId: ID!, $status: LeadStatus!) {
    updateLeadStatus(leadId: $leadId, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

export const GET_FULL_LEAD_PROFILE = gql`
  query FullLeadProfile($leadId: ID!) {
    lead: leadDetailWithTimeline(leadId: $leadId, eventsLimit: 50) {
      id
      leadCode
      name
      firstName
      lastName
      phone
      phones {
        id
        number
        isPrimary
        isWhatsapp
        label
      }
      assignedRM
      assignedRmId
      email
      gender
      age
      location
      product
      investmentRange
      sipAmount
      leadSource
      referralName
      referralCode
      createdAt
      approachAt
      updatedAt
      lastContactedAt
      clientStage
      stageFilter
      status
      nextActionDueAt
      occupations {
        profession
        designation
        companyName
        startedAt
        endedAt
      }
      remark {
        at
        byName
        text
      }
      bioText
      clientQa {
        question
        answer
      }
      events {
        id
        type
        text
        occurredAt
      }
    }

    applications: accountApplicationsByLead(leadId: $leadId) {
      id
      applicationStatus
      kycStatus
      riskProfile
      submittedAt
      reviewedAt
      approvedAt
      declinedAt
    }
  }
`;

// Separate optimized queries for different tabs

// Home Tab Query - Optimized for dashboard with stage grouping
export const HOME_LEADS_QUERY = gql`
  query HomeLeads($page: Int!, $pageSize: Int!) {
    myAssignedLeads(args: { page: $page, pageSize: $pageSize }) {
      items {
        id
        leadCode
        name
        firstName
        lastName
        phone
        leadSource
        clientStage
        stageFilter
        assignedRM
        assignedRmId
        nextActionDueAt
        createdAt
        updatedAt
        status
      }
      page
      pageSize
      total
    }
  }
`;

// Leads Tab Query - Optimized for full lead list view
export const LEADS_TAB_QUERY = gql`
  query LeadsTab($args: LeadListArgs!) {
    leads(args: $args) {
      items {
        id
        leadCode
        name
        firstName
        lastName
        phone
        leadSource
        clientStage
        stageFilter
        status
        assignedRM
        assignedRmId
        nextActionDueAt
        createdAt
        updatedAt
        lastContactedAt
      }
      page
      pageSize
      total
    }
  }
`;

// Follow-ups Tab Query - Optimized for today's follow-ups
export const FOLLOWUPS_TAB_QUERY = gql`
  query FollowupsTab($args: LeadListArgs!) {
    leads(args: $args) {
      items {
        id
        leadCode
        name
        firstName
        lastName
        phone
        leadSource
        clientStage
        status
        assignedRM
        assignedRmId
        nextActionDueAt
        createdAt
        updatedAt
      }
      page
      pageSize
      total
    }
  }
`;
