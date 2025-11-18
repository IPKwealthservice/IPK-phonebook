import { Lead, LeadStatusTone } from "@/features/home/data/leadData";

// Example REST integration
export async function fetchLeadsREST(baseUrl: string, token?: string): Promise<Lead[]> {
  const res = await fetch(`${baseUrl}/leads`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) throw new Error(`REST fetch failed (${res.status})`);
  const data = await res.json();
  return data as Lead[];
}

// Example GraphQL integration
const toneForStage = (stage?: string | null): LeadStatusTone => {
  switch (stage) {
    case "ACCOUNT_OPENED":
      return "success";
    case "RISKY_CLIENT_DORMANT":
      return "error";
    case "NO_RESPONSE_DORMANT":
    case "NOT_INTERESTED_DORMANT":
    case "HIBERNATED":
      return "muted";
    default:
      return "primary";
  }
};

export async function fetchLeadsGraphQL(endpoint: string, token?: string): Promise<Lead[]> {
  const query = `
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
        }
      }
    }
  `;

  const variables = { args: { page: 1, pageSize: 20 } };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`GraphQL fetch failed (${res.status})`);
  const json = await res.json();
  const items: Array<{
    id: string;
    name?: string | null;
    leadCode?: string | null;
    phone?: string | null;
    leadSource?: string | null;
    clientStage?: string | null;
    status?: string | null;
  }> = json.data?.leads?.items ?? [];
  return items.map((item) => ({
    id: item.id,
    name: item.name ?? item.leadCode ?? "Lead",
    phone: item.phone ?? "",
    company: item.leadSource ?? undefined,
    status: item.status ?? "Unknown",
    tone: toneForStage(item.clientStage),
  }));
}

