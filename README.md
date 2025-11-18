# IPK PhoneBook (Expo / React Native)

This is an Expo project configured with expo-router and Apollo Client.

## Get started

1. Install dependencies

   npm install

2. Start the app

   npx expo start

In the output, you can open the app in:
- Development build
- Android emulator
- iOS simulator
- Expo Go

You can start developing by editing files inside the `app` directory. The project uses file-based routing.

## Server integration (NestJS)

- Configure your API endpoints in `app.json` under `expo.extra`:
  - `EXPO_PUBLIC_GRAPHQL_URL`: e.g. `http://192.168.0.103:3333/graphql`
  - `EXPO_PUBLIC_API_URL`: e.g. `http://192.168.0.103:3333`
- The client auto-detects emulator/simulator hosts when not set:
  - Android emulator: `http://10.0.2.2:3333/graphql`
  - iOS simulator: `http://localhost:3333/graphql`
  - Physical device: use your PC’s LAN IP (e.g. `192.168.0.103`).
- On your NestJS server:
  - Bind to all interfaces so devices can reach it: `app.listen(3333, '0.0.0.0')`.
  - Enable CORS for web builds: `app.enableCors({ origin: true, credentials: true })`.
  - Ensure Windows Firewall allows inbound TCP 3333.
  - If using Firebase auth, the app sends `Authorization: Bearer <idToken>` on requests.

## Call features (overview)

- Current build triggers the native dialer via `tel:` links (no default-dialer role required).
- Android advanced (default dialer, TelecomManager, SIM state): requires a Development Build and native module.
  - Add permissions in `app.json` (already added): `CALL_PHONE`, `READ_PHONE_STATE`, `READ_CALL_LOG`, `READ_PHONE_NUMBERS`, `MANAGE_OWN_CALLS`.
  - Implement a native module wrapping `TelecomManager` and an intent for `ACTION_CHANGE_DEFAULT_DIALER`.
  - Build with `npx expo run:android` (or EAS) and set as default dialer when prompted.
- iOS advanced (CallKit, PushKit): requires native code and VoIP push entitlements.
  - Use CallKit to present call UI and PushKit for incoming call notifications.
  - Build with `npx expo run:ios` (or EAS) and configure capabilities in Xcode.

## Notes

- GraphQL client is configured in `core/graphql/apolloClient.ts` and reads the URL from `config/env.ts` (which resolves from `app.json` or sensible defaults).
- Example REST helpers live in `features/home/services/leads.service.ts`.
