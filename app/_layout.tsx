import { AppSplash } from "@/components/ui/AppSplash";
import { apolloClient } from "@/core/graphql/apolloClient";
import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { ApolloProvider } from "@apollo/client/react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { LogBox } from "react-native";
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
    // Silence SafeAreaView deprecation spam originating from dependencies
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated",
    ]);
  }, []);

  useEffect(() => {
    initializeAuthState();
  }, [initializeAuthState]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";
    const userRole = user?.role;
    const signedIn = isSignedIn();

    // Admin users must be signed in - redirect to sign-in if not
    if (userRole === 'ADMIN' && !signedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    // If signed in and in auth group, redirect to tabs
    if (signedIn && inAuthGroup) {
      router.replace("/(tabs)");
      return;
    }

    // For RM users and others: login is optional
    // Allow access to tabs even without login (RM users can use app without login)
    // Individual screens will handle showing appropriate content based on login status
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
