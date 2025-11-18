// config/env.ts
import Constants from "expo-constants";

type Extra = {
  EXPO_PUBLIC_API_URL?: string;         // base API (NestJS)
  EXPO_PUBLIC_GRAPHQL_URL?: string;     // GraphQL endpoint
  EXPO_PUBLIC_FB_API_KEY?: string;
  EXPO_PUBLIC_FB_AUTH_DOMAIN?: string;
  EXPO_PUBLIC_FB_PROJECT_ID?: string;
  EXPO_PUBLIC_FB_STORAGE_BUCKET?: string;
  EXPO_PUBLIC_FB_MESSAGING_SENDER_ID?: string;
  EXPO_PUBLIC_FB_APP_ID?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// ---------- API / GraphQL ----------

// Single source of truth for base API URL
const API_URL =
  extra.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://192.168.0.111:3333"; // fallback (change if you want)

// Always derive GraphQL URL from config, NEVER from hostUri/Platform
const GRAPHQL_URL =
  extra.EXPO_PUBLIC_GRAPHQL_URL ??
  process.env.EXPO_PUBLIC_GRAPHQL_URL ??
  `${API_URL}/graphql`;

// ---------- Firebase ----------

const FIREBASE = {
  apiKey:
    extra.EXPO_PUBLIC_FB_API_KEY ?? process.env.EXPO_PUBLIC_FB_API_KEY ?? "",
  authDomain:
    extra.EXPO_PUBLIC_FB_AUTH_DOMAIN ??
    process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN ??
    "",
  projectId:
    extra.EXPO_PUBLIC_FB_PROJECT_ID ??
    process.env.EXPO_PUBLIC_FB_PROJECT_ID ??
    "",
  storageBucket:
    extra.EXPO_PUBLIC_FB_STORAGE_BUCKET ??
    process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET ??
    "",
  messagingSenderId:
    extra.EXPO_PUBLIC_FB_MESSAGING_SENDER_ID ??
    process.env.EXPO_PUBLIC_FB_MESSAGING_SENDER_ID ??
    "",
  appId:
    extra.EXPO_PUBLIC_FB_APP_ID ?? process.env.EXPO_PUBLIC_FB_APP_ID ?? "",
};

export const ENV = {
  API_URL,
  GRAPHQL_URL,
  FIREBASE,
};
