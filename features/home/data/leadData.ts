export const leadCategories = [
  "ACCOUNT_OPENED",
  "CLIENT_INTERESTED",
  "FIRST_TALK_DONE",
  "FOLLOWING_UP",
  "HIBERNATED",
  "NEW_LEAD",
  "NOT_INTERESTED_DORMANT",
  "NO_RESPONSE_DORMANT",
  "RISKY_CLIENT_DORMANT",
  "Pending Calls",
  "Missed Calls",
] as const;

export type LeadCategory = (typeof leadCategories)[number];

export type LeadStatusTone = "primary" | "success" | "error" | "muted";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  company?: string;
  status: string;
  tone: LeadStatusTone;
};

// Base seed data (authoritative examples). We'll expand these
// to ensure each category has at least TARGET_COUNT demo rows.
const baseLeadCatalogue: Record<LeadCategory, Lead[]> = {
  ACCOUNT_OPENED: [
    { id: "AO-001", name: "Karan Singh", phone: "+91 90000 22121", company: "Singh Capital", status: "Account opened", tone: "success" },
    { id: "AO-002", name: "Sneha Rao", phone: "+971 50 321 7654", company: "Gulf Ventures", status: "Activated", tone: "success" }
  ],
  CLIENT_INTERESTED: [
    { id: "CI-101", name: "Aarav Patel", phone: "+91 99888 11223", company: "Patel Holdings", status: "Interested", tone: "primary" },
    { id: "CI-102", name: "Priya Menon", phone: "+91 98765 44321", company: "Nimbus Realty", status: "Requested details", tone: "primary" }
  ],
  FIRST_TALK_DONE: [
    { id: "FT-201", name: "Sarah Johnson", phone: "+1 212 555 0199", company: "Madison Consulting", status: "Intro call done", tone: "muted" },
    { id: "FT-202", name: "Mohammed Ali", phone: "+971 56 987 2310", company: "Ali Investments", status: "Next steps shared", tone: "muted" }
  ],
  FOLLOWING_UP: [
    { id: "FU-301", name: "Nikita Verma", phone: "+91 98450 77889", company: "Verma Finance", status: "Awaiting response", tone: "primary" },
    { id: "FU-302", name: "Rishi Kapoor", phone: "+1 415 555 0112", company: "Bay Area Tech", status: "Docs pending", tone: "primary" }
  ],
  HIBERNATED: [
    { id: "HB-401", name: "Emily Davis", phone: "+1 646 555 0147", company: "Davis Holdings", status: "Paused", tone: "muted" },
    { id: "HB-402", name: "Harini Iyer", phone: "+91 98200 44221", company: "Iyer Ventures", status: "Revisit later", tone: "muted" }
  ],
  NEW_LEAD: [
    { id: "NL-001", name: "Aarav Patel", phone: "+91 99888 11223", company: "Patel Holdings", status: "New lead", tone: "primary" },
    { id: "NL-002", name: "Isabella Costa", phone: "+34 600 123 987", company: "Costa Partners", status: "Qualified inbound", tone: "primary" }
  ],
  NOT_INTERESTED_DORMANT: [
    { id: "NID-501", name: "Grace Lee", phone: "+65 8123 4433", company: "Lee Strategic", status: "Not interested", tone: "muted" },
    { id: "NID-502", name: "Liam O'Connor", phone: "+44 20 7946 0703", company: "O'Connor Group", status: "On hold", tone: "muted" }
  ],
  NO_RESPONSE_DORMANT: [
    { id: "NRD-601", name: "Noah Williams", phone: "+1 305 555 0101", company: "Williams Finance", status: "No response", tone: "error" },
    { id: "NRD-602", name: "Rohit Gupta", phone: "+91 98765 55667", company: "Gupta Retail", status: "Unreachable", tone: "error" }
  ],
  RISKY_CLIENT_DORMANT: [
    { id: "RCD-701", name: "Kunal Malhotra", phone: "+91 99000 88001", company: "Malhotra Textiles", status: "Risk flagged", tone: "error" },
    { id: "RCD-702", name: "Sunil Nair", phone: "+91 98111 44770", company: "Nair Logistics", status: "Compliance pending", tone: "error" }
  ],
  "Pending Calls": [
    { id: "PC-301", name: "Rohit Gupta", phone: "+91 98765 55667", company: "Gupta Retail", status: "Call by 6 PM", tone: "primary" },
    { id: "PC-302", name: "Ananya Desai", phone: "+91 90080 33445", company: "Desai Metals", status: "Share pitch deck", tone: "primary" }
  ],
  "Missed Calls": [
    { id: "MC-401", name: "Sofia Martinez", phone: "+52 55 1234 8765", company: "Martinez Trading", status: "Missed at 09:20", tone: "error" },
    { id: "MC-402", name: "Grace Lee", phone: "+65 8123 4433", company: "Lee Strategic", status: "Request call back", tone: "primary" }
  ]
};

const TARGET_COUNT = 6;

const pad = (n: number) => n.toString().padStart(3, "0");

function expandLeads(seed: Lead[], category: LeadCategory): Lead[] {
  const out: Lead[] = [...seed];
  if (out.length === 0) {
    // Fallback seed if category accidentally empty
    out.push({
      id: `${String(category)}-000`,
      name: `Demo ${String(category)} 1`,
      phone: "+91 90000 00001",
      company: undefined,
      status: "Demo",
      tone: "primary",
    });
  }
  let i = 0;
  while (out.length < TARGET_COUNT) {
    const src = seed[i % seed.length];
    const idx = out.length + 1;
    // Create lightly varied clones to look unique
    const idPrefix = typeof category === "string" ? category.replace(/\s+/g, "-") : String(category);
    const suffix = pad(idx);
    const phoneTail = (100 + idx).toString().slice(-3);
    out.push({
      ...src,
      id: `${idPrefix}-${suffix}`,
      name: `${src.name} ${idx}`,
      phone: src.phone.replace(/\d(?=\d{2}$)/g, (d) => d).slice(0, -3) + phoneTail,
    });
    i++;
  }
  return out;
}

// Public catalogue export used across the app
export const leadCatalogue: Record<LeadCategory, Lead[]> = Object.fromEntries(
  leadCategories.map((category) => [
    category,
    expandLeads(baseLeadCatalogue[category] ?? [], category),
  ])
) as Record<LeadCategory, Lead[]>;
