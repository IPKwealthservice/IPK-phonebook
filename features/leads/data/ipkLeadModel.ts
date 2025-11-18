import {
  Lead,
  LeadCategory,
  leadCatalogue,
  leadCategories,
} from "@/features/home/data/leadData";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type Profession =
  | "Founder"
  | "Investor"
  | "CXO"
  | "FamilyOffice"
  | "Professional"
  | "Entrepreneur"
  | "Other";
export type LeadStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "QUALIFIED"
  | "CONVERTED"
  | "ARCHIVED";
export type ClientStage = "Prospect" | "Pitch" | "Negotiation" | "Customer";

// Lead pipeline stages used across the app
export type LeadPipelineStage =
  | "ACCOUNT_OPENED"
  | "CLIENT_INTERESTED"
  | "FIRST_TALK_DONE"
  | "FOLLOWING_UP"
  | "HIBERNATED"
  | "NEW_LEAD"
  | "NOT_INTERESTED_DORMANT"
  | "NO_RESPONSE_DORMANT"
  | "RISKY_CLIENT_DORMANT";

export const PIPELINE_STAGES: LeadPipelineStage[] = [
  "ACCOUNT_OPENED",
  "CLIENT_INTERESTED",
  "FIRST_TALK_DONE",
  "FOLLOWING_UP",
  "HIBERNATED",
  "NEW_LEAD",
  "NOT_INTERESTED_DORMANT",
  "NO_RESPONSE_DORMANT",
  "RISKY_CLIENT_DORMANT",
];

export type LeadPhone = {
  label: string;
  number: string;
  primary?: boolean;
};

export type Occupation = {
  title: string;
  company?: string;
  designation?: string;
};

export type Product = {
  code: string;
  label: string;
};

export type AccountApplication = {
  id: string;
  product: string;
  status: string;
  submittedAt: string;
};

export type LeadEvent = {
  id: string;
  type: string;
  note?: string;
  at: string;
};

export type IpkLead = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone: string;
  phoneNormalized?: string;
  phones: LeadPhone[];
  leadCode?: string;
  gender?: Gender;
  age?: number;
  location?: string;
  referralCode?: string;
  referralName?: string;
  leadSource: string;
  profession?: Profession;
  companyName?: string;
  designation?: string;
  occupations: Occupation[];
  product?: Product;
  investmentRange?: string;
  sipAmount?: number;
  clientTypes?: string;
  remark?: string;
  bioText?: string;
  assignedRmId?: string;
  assignedRm?: string;
  assignedRM?: string;
  status: LeadStatus;
  clientStage?: ClientStage;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  revisitCount: number;
  firstSeenAt: string;
  lastSeenAt?: string;
  reenterCount: number;
  approachAt?: string;
  clientQa?: Record<string, unknown>;
  lastContactedAt?: string;
  contactAttempts?: number;
  nextActionDueAt?: string;
  events: LeadEvent[];
  leadScore?: number;
  applications: AccountApplication[];
  // Current pipeline stage for the lead
  pipelineStage: LeadPipelineStage;
};

const toNames = (fullName: string) => {
  const chunks = fullName?.split(" ") ?? [];
  const firstName = chunks[0];
  const lastName =
    chunks.length > 1 ? chunks.slice(1).join(" ").trim() || undefined : undefined;
  return { firstName, lastName };
};

const randomDateISO = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString();
};

const mapLeadToModel = (
  lead: Lead,
  category: LeadCategory,
  index: number
): IpkLead => {
  const deriveStageFromCategory = (
    cat: LeadCategory
  ): LeadPipelineStage => {
    // If category itself is a pipeline stage, use it directly
    if ((PIPELINE_STAGES as readonly string[]).includes(cat as string)) {
      return cat as LeadPipelineStage;
    }
    // Map special non-stage categories into closest stage
    switch (cat) {
      case "Pending Calls":
        return "FOLLOWING_UP";
      case "Missed Calls":
        return "NO_RESPONSE_DORMANT";
      default:
        return "NEW_LEAD";
    }
  };
  const { firstName, lastName } = toNames(lead.name);
  return {
    id: lead.id ?? `lead-${index}`,
    firstName,
    lastName,
    name: lead.name,
    email: undefined,
    phone: lead.phone,
    phoneNormalized: lead.phone.replace(/\s|[-()]/g, ""),
    phones: [
      { label: "Mobile", number: lead.phone, primary: true },
      { label: "Work", number: lead.phone, primary: false },
    ],
    leadCode: lead.id,
    gender: "UNKNOWN",
    age: undefined,
    location: lead.company,
    referralCode: undefined,
    referralName: undefined,
    leadSource: category,
    profession: lead.company ? "Entrepreneur" : "Other",
    companyName: lead.company,
    designation: lead.status,
    occupations: lead.company
      ? [{ title: "Founder", company: lead.company, designation: lead.status }]
      : [],
    product: { code: "WM-CONSULT", label: "Wealth Management" },
    investmentRange: "INR 25L - 2Cr",
    sipAmount: 25000,
    clientTypes: "HNI",
    remark: lead.status,
    bioText: lead.company,
    assignedRmId: undefined,
    assignedRm: undefined,
    assignedRM: "IPK RM Desk",
    status: "IN_PROGRESS",
    clientStage: "Prospect",
    createdAt: randomDateISO(index + 2),
    updatedAt: randomDateISO(index),
    archived: false,
    revisitCount: 0,
    firstSeenAt: randomDateISO(index + 10),
    lastSeenAt: randomDateISO(index + 1),
    reenterCount: 0,
    approachAt: randomDateISO(index + 3),
    clientQa: undefined,
    lastContactedAt: randomDateISO(index + 1),
    contactAttempts: 1,
    nextActionDueAt: randomDateISO(index - 1),
    events: [
      {
        id: `${lead.id}-event`,
        type: "NOTE",
        note: lead.status,
        at: randomDateISO(index + 1),
      },
    ],
    leadScore: 72,
    applications: [
      {
        id: `${lead.id}-app`,
        product: "IPK Wealth Account",
        status: "Draft",
        submittedAt: randomDateISO(index + 4),
      },
    ],
    pipelineStage: deriveStageFromCategory(category),
  };
};

export const ipkLeadPipeline: IpkLead[] = leadCategories.flatMap(
  (category) => {
    const records = leadCatalogue[category] ?? [];
    return records.map((lead, index) => mapLeadToModel(lead, category, index));
  }
);

// Grouped demo data by category for easy integration in UIs
// that want to render per-pipeline content using the richer
// IpkLead model instead of the lightweight Lead type.
export const ipkPipelineByCategory: Record<LeadCategory, IpkLead[]> =
  Object.fromEntries(
    leadCategories.map((category) => [
      category,
      (leadCatalogue[category] ?? []).map((lead, index) =>
        mapLeadToModel(lead, category, index)
      ),
    ])
  ) as Record<LeadCategory, IpkLead[]>;

// Convenience helpers for consumers that need a single call
// to wire demo data across the whole pipeline UI.
export function getAllPipelineDemoData() {
  return {
    categories: leadCategories,
    byCategory: ipkPipelineByCategory,
    all: ipkLeadPipeline,
  } as const;
}
