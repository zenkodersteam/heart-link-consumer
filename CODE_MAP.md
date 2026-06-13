# CODE_MAP

Feature-oriented map of the HeartLink consumer app. Web-first Expo project.

---

## Auth (sign-in / sign-up / session)

Category: UI

Primary Files:
- `app/(auth)/_layout.tsx`
- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`
- `src/lib/token-cache.ts`
- `app/_layout.tsx` (ClerkProvider host)

Supporting Files:
- `src/components/AuthShell.tsx`
- `src/components/primitives.tsx` (Field, Button)

External Integrations:
- Clerk (`@clerk/clerk-expo`) — sign-in, sign-up, email-code verification, session
- `expo-secure-store` (native) / `window.localStorage` (web) — token persistence

Entry Points:
- `/(auth)/sign-in`
- `/(auth)/sign-up`

---

## Profile Browse (list + filters)

Category: UI

Primary Files:
- `app/(tabs)/index.tsx` (browse screen)
- `src/components/ProfileCard.tsx`
- `src/components/FilterSheet.tsx`
- `src/lib/use-public-profiles.ts`
- `src/lib/use-keyboard-grid-nav.ts`

Supporting Files:
- `src/components/primitives.tsx`
- `src/theme.ts`
- `src/lib/api.ts` (types + client)
- `src/lib/use-api-client.ts`

External Integrations:
- HeartLink Railway API `GET /api/profiles`
- AWS S3 presigned photo URLs (returned by API)
- Clerk JWT for `Authorization` header

Entry Points:
- `/(tabs)` (default route after sign-in)

---

## Profile Detail (hero + gallery + bio + facility)

Category: UI

Primary Files:
- `app/(tabs)/profile.tsx`
- `src/lib/use-public-profiles.ts` (`usePublicProfile`)

Supporting Files:
- `src/components/primitives.tsx` (Card, Pill, Button)
- `src/theme.ts`
- `src/lib/api.ts`

External Integrations:
- HeartLink Railway API `GET /api/profiles/:id`
- AWS S3 presigned photo URLs

Entry Points:
- `/(tabs)/profile?id=<uuid>`

---

## Account (signed-in user, sign out)

Category: UI

Primary Files:
- `app/(tabs)/account.tsx`

Supporting Files:
- `src/components/primitives.tsx` (Card, Button)

External Integrations:
- Clerk (`useUser`, `useAuth().signOut`)

Entry Points:
- `/(tabs)/account`

---

## API Client (typed fetch wrapper)

Category: Service

Primary Files:
- `src/lib/api.ts` (inlined types + `createApiClient`)
- `src/lib/use-api-client.ts` (Clerk-token-aware factory hook)

External Integrations:
- HeartLink Railway API base URL via `EXPO_PUBLIC_API_BASE_URL`
- Clerk JWT via `useAuth().getToken()`

---

## Brand / Theme

Category: UI

Primary Files:
- `src/theme.ts` (colors, fonts, radii, spacing, type scale)

Supporting Files:
- `src/components/primitives.tsx`
- `src/components/AuthShell.tsx`
- `app/_layout.tsx` (font loader)

External Integrations:
- `@expo-google-fonts/bree-serif` (headings)
- `@expo-google-fonts/inter` (body, 400/500/600/700)

---

## Build & Deploy

Category: Infra

Primary Files:
- `package.json`
- `app.config.ts`
- `babel.config.js`
- `vercel.json`
- `.vercelignore`
- `.env.example`

External Integrations:
- Vercel (static export hosting)
- Expo CLI (`expo export --platform web`)
- Babel preset Expo + reanimated plugin

Entry Points:
- `npm run web` (local dev)
- `npm run build:web` (produces `dist/`)
- `vercel --prod` (deploy)
