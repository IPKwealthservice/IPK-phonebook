// core/graphql/apolloClient.ts
import { ENV } from "@/config/env";
import { auth } from "@/core/firebase/firebaseConfig";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// Use endpoint from ENV (controlled by app.json / .env)
const httpLink = new HttpLink({
  uri: ENV.GRAPHQL_URL,
});

// Attach Firebase ID token so NestJS (FirebaseAuthGuard) can authenticate requests
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await auth.currentUser?.getIdToken?.();
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  } catch {
    return { headers };
  }
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
