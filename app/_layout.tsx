import { AppSplash } from "@/components/ui/AppSplash";
import { apolloClient } from "@/core/graphql/apolloClient";
import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { ApolloProvider } from "@apollo/client/react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";



import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { isSignedIn } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrateUserFromGraphQL);
  const initializeAuthState = useAuthStore((s) => s.initializeAuthState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, [segments]);

  useEffect(() => {
    initializeAuthState();
  }, [initializeAuthState]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn() && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn() && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [segments, ready, router, isSignedIn, user]);

  // Ensure profile is hydrated after app refresh when already signed in
  useEffect(() => {
    if (!ready) return;
    if (user && !hydrated) {
      hydrate().catch(() => {});
    }
  }, [ready, user, hydrated, hydrate]);

  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider>
          <StatusBar style="auto" />
          {ready ? <Slot /> : <AppSplash />}
        </ThemeProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
