import { apolloClient } from "@/core/graphql/apolloClient";
import { ME_QUERY } from "@/core/graphql/queries";

export type MeProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  role?: 'ADMIN' | 'MARKETING' | 'RM' | 'STAFF' | string;
};

export async function fetchCurrentUser(): Promise<MeProfile | null> {
  try {
    const { data } = await apolloClient.query<{ me: MeProfile | null }>({
      query: ME_QUERY,
      fetchPolicy: "network-only",
    });
    return data?.me ?? null;
  } catch (err) {
    // If GraphQL is unavailable or unauthorized, return null
    return null;
  }
}

