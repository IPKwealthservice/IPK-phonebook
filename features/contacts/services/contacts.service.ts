import { Result, ok, err } from "@/core/utils/result";
import { Contact } from "@/features/contacts/types";
import { apolloClient } from "@/core/graphql/apolloClient";
import { ACTIVE_RMS } from "@/core/graphql/queries";

export async function fetchSiteContacts(): Promise<Result<Contact[], string>> {
  try {
    const { data } = await apolloClient.query<{ activeRms: Array<{ id: string; name: string; email?: string | null; phone?: string | null }>}>({
      query: ACTIVE_RMS,
      fetchPolicy: "network-only",
    });
    const contacts: Contact[] = (data?.activeRms ?? []).map((rm) => ({
      id: String(rm.id),
      displayName: rm.name,
      phone: rm.phone ?? "",
      email: rm.email ?? undefined,
      avatarUri: undefined,
    }));
    return ok(contacts);
  } catch (e: any) {
    return err(e?.message ?? "Failed to fetch RM contacts");
  }
}
