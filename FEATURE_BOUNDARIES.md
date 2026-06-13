# FEATURE_BOUNDARIES

Responsibility boundaries between components in the HeartLink consumer app.

---

## Auth (`app/(auth)/*`, `app/_layout.tsx`, `src/lib/token-cache.ts`)

Owns:
- Sign-in form + flow
- Sign-up form + email-code verification flow
- Clerk provider setup
- Session token persistence (SecureStore on native, localStorage on web)
- Redirect rules for signed-in vs signed-out users at the route-group level

Does NOT Own:
- Profile data fetching
- User profile editing (post-MVP)
- Account settings beyond email display + sign out (handled in `account.tsx`)
- Server-side user record creation (Clerk webhook → HeartLink admin API, out of this repo)

Communicates With:
- Clerk SDK (`@clerk/clerk-expo`)
- `expo-router` for redirects

Isolation Level: Strong

---

## Profile Browse (`app/(tabs)/index.tsx`, `src/lib/use-public-profiles.ts`, `src/components/ProfileCard.tsx`, `src/components/FilterSheet.tsx`)

Owns:
- Profile list rendering (responsive 1-4 column grid)
- Filter state + filter sheet UI
- Pull-to-refresh
- Keyboard navigation between cards (web only)
- Navigation to detail screen

Does NOT Own:
- Profile data shape (defined in `src/lib/api.ts`)
- HTTP fetch mechanics (delegated to `useApiClientFactory`)
- Saving / favoriting profiles (post-MVP)
- Swipe gestures (post-MVP, native only)

Communicates With:
- `src/lib/api.ts` (types)
- `src/lib/use-api-client.ts` (data fetch)
- `src/lib/use-keyboard-grid-nav.ts` (keyboard input)
- `src/components/primitives.tsx` (Button)
- `expo-router` (navigation)

Isolation Level: Strong

---

## Profile Detail (`app/(tabs)/profile.tsx`)

Owns:
- Single-profile rendering with hero image + thumbnail strip
- About + Details cards
- Photo gallery interaction (thumbnail tap swaps hero)
- Back navigation

Does NOT Own:
- Profile fetch logic (delegated to `usePublicProfile`)
- Profile list / filter / browse
- Reporting / blocking / favoriting (post-MVP)

Communicates With:
- `src/lib/use-public-profiles.ts` (`usePublicProfile`)
- `src/components/primitives.tsx` (Card, Pill, Button)
- `expo-router` (params + back)

Isolation Level: Strong

---

## Account (`app/(tabs)/account.tsx`)

Owns:
- Display of signed-in user's email
- Sign-out action

Does NOT Own:
- Profile editing
- Subscription / billing management (post-MVP)
- Notification preferences (post-MVP)

Communicates With:
- Clerk SDK (`useUser`, `useAuth`)
- `expo-router`
- `src/components/primitives.tsx`

Isolation Level: Strong

---

## API Client (`src/lib/api.ts`, `src/lib/use-api-client.ts`)

Owns:
- HTTP fetch wrapper with auth header injection
- Public consumer API types (PublicProfileSummary, PublicProfileDetail, ListPublicProfilesQuery, etc.)
- Error class (`ApiClientError`)
- Per-request Clerk JWT lookup

Does NOT Own:
- UI rendering
- State management beyond the single hook contract
- Caching (always `cache: 'no-store'`)
- Admin API endpoints (out of scope for consumer)
- Write endpoints (currently read-only)

Communicates With:
- `@clerk/clerk-expo` (token retrieval)
- HeartLink Railway API (HTTP)

Isolation Level: Strong (pure module, no React imports inside `api.ts`)

---

## Theme / Primitives (`src/theme.ts`, `src/components/primitives.tsx`, `src/components/AuthShell.tsx`)

Owns:
- Brand tokens (colors, radii, spacing, font family names, type scale)
- Generic UI primitives: Field, Button, Card, Pill
- Auth screen layout shell (centered, branded, max-440px)

Does NOT Own:
- Feature-specific rendering (those live in feature folders)
- Animation logic
- Form state management (consumers manage their own state)

Communicates With:
- React Native primitives (View, Text, Pressable, StyleSheet, TextInput)
- `react-native-safe-area-context` (in AuthShell)

Isolation Level: Strong (no dependencies on any feature module)

---

## Build / Deploy (`package.json`, `vercel.json`, `app.config.ts`, `babel.config.js`)

Owns:
- Dependency manifest
- Expo SDK + plugin config
- Babel preset + reanimated plugin
- Vercel build command + SPA rewrite
- Web bundle output (`dist/`)

Does NOT Own:
- Runtime behavior
- Environment variable values (only their declared names in `.env.example`)
- Vercel project settings (those live in the Vercel dashboard)

Communicates With:
- Expo CLI
- Vercel CLI
- Vercel build infrastructure

Isolation Level: Moderate (config files are referenced by every build)
