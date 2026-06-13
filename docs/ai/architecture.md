# Architecture

System design for the standalone HeartLink consumer app. Pair with `CODE_MAP.md` (file map), `DATA_FLOW.md` (system flows), and `FEATURE_BOUNDARIES.md` (component responsibilities).

## System Overview

Single-page web app served as a static bundle from Vercel. Boots an Expo Router tree, gates routes via Clerk auth, and reads the public profile surface from the HeartLink Railway NestJS API.

**Style:** Standalone SPA (no backend in this repo)
**Hosting:** Vercel (static export from `expo export --platform web`)

## Core Components

### Auth (Clerk-driven)
- **Responsibility:** Sign-in, sign-up with email-code verification, session token persistence, route gating
- **Tech:** `@clerk/clerk-expo`, `expo-secure-store` (native), `window.localStorage` (web)
- **Key files:** `app/(auth)/*`, `app/_layout.tsx`, `src/lib/token-cache.ts`
- **Depends on:** Clerk hosted service

### Profile Browse
- **Responsibility:** List active public profiles, filter, navigate to detail
- **Tech:** React Native FlatList + Pressable, hover/focused states via RN Web
- **Key files:** `app/(tabs)/index.tsx`, `src/components/ProfileCard.tsx`, `src/components/FilterSheet.tsx`, `src/lib/use-public-profiles.ts`, `src/lib/use-keyboard-grid-nav.ts`
- **Depends on:** API Client, Clerk JWT

### Profile Detail
- **Responsibility:** Render full profile with photo gallery, bio, facility info
- **Tech:** ScrollView + expo-image hero + horizontal thumbnail strip
- **Key files:** `app/(tabs)/profile.tsx`, `src/lib/use-public-profiles.ts` (`usePublicProfile`)
- **Depends on:** API Client, Clerk JWT

### Account
- **Responsibility:** Show signed-in user email, sign out
- **Key files:** `app/(tabs)/account.tsx`
- **Depends on:** Clerk SDK

### API Client
- **Responsibility:** Typed fetch wrapper with auth header injection
- **Tech:** Native `fetch`, Clerk `getToken()` for Bearer JWT
- **Key files:** `src/lib/api.ts` (types + `createApiClient`), `src/lib/use-api-client.ts` (Clerk-aware factory)
- **Depends on:** HeartLink Railway API, Clerk SDK

### Theme / Primitives
- **Responsibility:** Brand tokens + generic UI primitives (Field, Button, Card, Pill)
- **Key files:** `src/theme.ts`, `src/components/primitives.tsx`, `src/components/AuthShell.tsx`

## Data Flow (Critical Path)

1. User opens URL → Vercel serves `index.html` + JS bundle
2. Expo Router boots → `app/_layout.tsx` renders ClerkProvider after fonts load
3. `app/index.tsx` checks Clerk auth state → redirects to `/(auth)/sign-in` or `/(tabs)`
4. If signed in: `BrowseScreen` mounts → `usePublicProfiles` → `useApiClientFactory().listPublicProfiles(query)` → `fetch GET /api/profiles?...` with Bearer JWT
5. HeartLink API returns `PublicProfileSummary[]` → `<FlatList>` renders `ProfileCard` items
6. User clicks card → `router.push('/(tabs)/profile?id=<uuid>')` → `usePublicProfile` → `fetch GET /api/profiles/:id` → detail screen renders

## Data Stores

- **Clerk** — user identity, session tokens, email verification state. External, hosted.
- **`token-cache`** — Clerk session token only. `expo-secure-store` on native, `window.localStorage` on web. No app data stored here.
- **`expo-image` cache** — image bytes only. Browser cache on web, expo-image disk cache on native.
- **No application database in this repo.** Backed by the HeartLink Railway API which reads from Supabase Postgres.

## External Integrations

- **Clerk** — auth provider (sign-in, sign-up, sessions). Same instance as the admin app.
- **HeartLink Railway API** — NestJS backend at `EXPO_PUBLIC_API_BASE_URL`. Read-only public endpoints (`GET /api/profiles[/:id]`) for now.
- **AWS S3** — indirect; profile photo URLs are presigned S3 URLs minted by the API. Client fetches images directly from S3.
- **Google Fonts** — Bree Serif + Inter via `@expo-google-fonts/*` (bundled with the app, not fetched at runtime).
- **Vercel** — static hosting + SPA rewrite.

## Security Boundaries

- **Public assets:** the JS bundle, fonts, and `index.html` are public on Vercel. No secrets in client code.
- **Auth:** Clerk handles credentials end-to-end. Tokens are stored client-side and sent as `Authorization: Bearer` headers.
- **API:** every request to `/api/profiles[/:id]` requires a Clerk JWT with `outside_user` role. The admin API enforces role + visibility filtering (`status='active' AND isPubliclyVisible=true`) — the client never sees drafts or hidden profiles.
- **S3 photos:** presigned URLs with short TTL (15 min per the parent monorepo's storage provider). Client fetches images directly; no S3 credentials exposed.
- **No write endpoints exposed to this client.** Any future write flow (favorites, reports) requires both API contract update + this repo's `api.ts` re-sync.

## Known Constraints / Trade-offs

- **No client-side cache.** Every fetch is `cache: 'no-store'`. Re-renders re-fetch. Tradeoff: simple, always-fresh; cost: extra HTTP. Add SWR or React Query if pages start feeling slow.
- **No code splitting beyond Expo Router defaults.** All screens load with the initial bundle. Fine for MVP scale.
- **Manual API type sync.** See ADR-002.
- **Web-only MVP.** See ADR-003.
- **Hot Heart Pink `#E91E73` + Metallic Gold `#D6A84F` on Deep Midnight Purple `#1a0833`.** Brand book canonical palette; don't redefine in component-local styles.
