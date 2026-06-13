# DATA_FLOW

System-level data movement for the HeartLink consumer app.

---

## User Sign-In

Source: User submits email + password form (`app/(auth)/sign-in.tsx`)
Transport: HTTPS to Clerk's hosted API via `@clerk/clerk-expo` SDK
Processor: Clerk verifies credentials, issues session JWT
Storage: Session token persisted via `src/lib/token-cache.ts` (`expo-secure-store` on native, `window.localStorage` on web)
Downstream Consumers: `useAuth().isSignedIn` triggers redirect from `app/(auth)/*` → `app/(tabs)`

---

## User Sign-Up

Source: User submits email + password form (`app/(auth)/sign-up.tsx`)
Transport: HTTPS to Clerk
Processor: Clerk creates user, sends 6-digit email verification code; user submits code; Clerk activates session
Storage: User row created in Clerk; HeartLink admin API receives `user.created` webhook (handled in the main monorepo, out of scope for this repo) which syncs to Postgres `users` table
Downstream Consumers: Redirect to `/(tabs)`

---

## Profile Browse List

Source: `BrowseScreen` mount or filter change in `app/(tabs)/index.tsx`
Transport: `usePublicProfiles` hook → `useApiClientFactory` → `createApiClient` (`src/lib/api.ts`) → `fetch GET /api/profiles?<query>` with `Authorization: Bearer <Clerk JWT>`
Processor: HeartLink Railway API filters by `status='active' AND isPubliclyVisible=true` plus query filters (age, state, facility, plan tier), joins facilities + subscriptions + primary photo
Storage: None client-side (no cache layer; each query is a fresh fetch with `cache: 'no-store'`)
Downstream Consumers: `<FlatList>` of `ProfileCard` components rendering `PublicProfileSummary` items

---

## Profile Detail

Source: User taps a card in browse → `router.push('/(tabs)/profile?id=<uuid>')`
Transport: `usePublicProfile(id)` → `GET /api/profiles/:id` with Clerk JWT
Processor: HeartLink API returns full `PublicProfileDetail` including bio, release date, approved-only photos with presigned S3 URLs
Storage: None client-side
Downstream Consumers: Hero image, thumbnail strip, bio card, details card on `app/(tabs)/profile.tsx`

---

## Photo Rendering

Source: `primaryPhotoUrl` (in summary) or `photos[].presignedUrl` (in detail) — both are AWS S3 presigned URLs minted by the HeartLink API
Transport: Direct `<Image source={{ uri }} />` HTTPS fetch from S3
Processor: `expo-image` cache + transition
Storage: `expo-image` local cache (web → browser cache; native → expo-image's disk cache)
Downstream Consumers: `ProfileCard` thumbnail; `profile.tsx` hero + gallery

---

## Sign-Out

Source: User taps "Sign out" in `app/(tabs)/account.tsx`
Transport: Clerk SDK `useAuth().signOut()`
Processor: Clerk revokes session
Storage: `token-cache` token cleared
Downstream Consumers: `/(tabs)/_layout` detects signed-out state, redirects to `/(auth)/sign-in`

---

## Keyboard Navigation (Web Only)

Source: `window.keydown` events on the browse screen
Transport: `useKeyboardGridNav` hook (Platform.OS === 'web' guard)
Processor: Computes next focused index based on `numColumns` and key (ArrowLeft/Right/Up/Down/Home/End/Enter/Space)
Storage: Local React state (`focusedIdx`)
Downstream Consumers: `ProfileCard focused={...}` prop triggers focus ring; `FlatList.scrollToIndex` keeps focused card in view; Enter/Space calls `router.push` to detail

---

## Out of Scope

This client does not produce data, mutate server state, send analytics, or write to any external system other than Clerk auth. All inbound data is read-only HTTP GETs against the HeartLink Railway API.
