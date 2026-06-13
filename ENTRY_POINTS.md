# ENTRY_POINTS

All execution entry points for the HeartLink consumer app.

---

## App Bootstrap

Path: `expo-router/entry` (declared as `"main"` in `package.json`)
Responsibility: Expo Router boots the React tree and mounts file-based routes from `app/`.
Invokes: `app/_layout.tsx`
Depends On: `expo-router`, `react-native`, the entire `app/` tree

---

## Root Layout

Path: `app/_layout.tsx`
Responsibility: Loads fonts, sets up `ClerkProvider`, wraps children in `GestureHandlerRootView`, hides the splash screen once fonts resolve, renders `<Slot />`.
Invokes: `app/index.tsx` (initial route), then `app/(auth)/*` or `app/(tabs)/*` per redirect
Depends On:
- `@clerk/clerk-expo`
- `@expo-google-fonts/bree-serif`, `@expo-google-fonts/inter`
- `expo-font`, `expo-splash-screen`, `expo-status-bar`
- `react-native-gesture-handler`
- `src/lib/token-cache.ts`
- `src/theme.ts`
- `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

---

## Initial Redirect

Path: `app/index.tsx`
Responsibility: Reads Clerk's `isSignedIn`, redirects to either `/(tabs)` or `/(auth)/sign-in`.
Invokes: `expo-router` `<Redirect />`
Depends On: `@clerk/clerk-expo` `useAuth`

---

## Auth Group Layout

Path: `app/(auth)/_layout.tsx`
Responsibility: Renders auth screens; auto-redirects to `/(tabs)` if signed in.
Invokes: `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`
Depends On: `@clerk/clerk-expo`, `expo-router` `<Stack />`

---

## Tabs Group Layout

Path: `app/(tabs)/_layout.tsx`
Responsibility: Renders tab bar; auto-redirects to `/(auth)/sign-in` if signed out. Hides `profile` route from tabs (push-only).
Invokes: `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/account.tsx`
Depends On: `@clerk/clerk-expo`, `expo-router` `<Tabs />`, `src/theme.ts`

---

## Routes

| Route | Path | Responsibility |
|---|---|---|
| `/` | `app/index.tsx` | Auth-aware redirect |
| `/(auth)/sign-in` | `app/(auth)/sign-in.tsx` | Email + password sign in via Clerk |
| `/(auth)/sign-up` | `app/(auth)/sign-up.tsx` | Sign up + email-code verification |
| `/(tabs)` | `app/(tabs)/index.tsx` | Profile browse with filters + keyboard nav |
| `/(tabs)/profile?id=<uuid>` | `app/(tabs)/profile.tsx` | Profile detail with photo gallery |
| `/(tabs)/account` | `app/(tabs)/account.tsx` | Signed-in user info + sign out |

---

## Build Entry Points

| Command | Effect |
|---|---|
| `npm run dev` / `expo start` | Local Metro dev server |
| `npm run web` | Local Metro dev server, web target |
| `npm run build:web` | `expo export --platform web --output-dir dist` (production static bundle) |
| `vercel --prod` | Vercel CLI deploy; Vercel runs `vercel.json` `buildCommand` (`npx expo export --platform web --output-dir dist`) |

---

## Out of Scope

No CLI scripts, no workers, no Kafka consumers, no cron jobs, no Lambda handlers, no background runners. This repo is a single-page web client.
