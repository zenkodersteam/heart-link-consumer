# Project Memory

Running history of what's been built and current state. Update after major changes.

## Current State

**Status:** Live in Production — post-launch refinement
**Last Updated:** 2026-07-26
**Version:** 0.1.0 (production)
**Production URL:** https://heart-link-consumer.vercel.app

### What's Working
- Repo scaffolded with full Expo Router 4 structure (6 routes, 4 components, 5 lib modules)
- Clerk auth wired (sign-in, sign-up with email-code verification, token cache for web + native)
- Profile browse screen with responsive 1-4 column grid, hover + keyboard nav (web only)
- Profile detail screen with hero photo + thumbnail strip + bio + facility info
- Filter sheet covering age / state / facility / plan tier (per 2026-05-12 client direction)
- Brand theme: Deep Midnight Purple bg, Hot Heart Pink primary, Metallic Gold accent, Bree Serif + Inter
- Production marketing landing page — approved by project lead and live at https://heart-link-consumer.vercel.app; renders immediately while Clerk/auth loads, frames HeartLink as private supported correspondence, and hands off to the app login
- Landing hero uses correspondence-first profile surfaces inside both the desktop browser panel and the phone window; primary mock action is writing a letter, not swipe/pass dating mechanics
- Full UI lift live (2026-07-24): midnight-rail shell, bridge-art sign-in, plan columns with art, story-panel browse, level-2 resources/support/profile screens, branded empty states, micro-interactions — all per the approved mockup, desktop + mobile
- Browse layout polish live (2026-07-26): desktop profile deck and story panel align to the same top y-position, stretch to equal heights, and keep balanced responsive breathing room between the header/filter group and viewport bottom.
- Premium consumer UX fixes live (2026-07-26): signed-in refresh no longer flashes the public landing page, profile photos use cache/priority/prefetch behavior, and redundant liked-screen hearts were removed.
- Outside-user onboarding live (2026-07-26): non-inmate members answer applicable intake-form questions for identity, connection intent, lifestyle, communication, story, what they are looking for, optional photo, and review before moderation submission.
- Letter-writing is gated behind liked/saved profiles on the consumer client and direct compose routes are protected at the UI layer.

### Known Issues
- API types inlined from monorepo (`src/lib/api.ts`); manual sync required when admin API contract changes
- Backend API changes for outside-user preference persistence and server-side liked-before-letter enforcement were pushed to the HeartLink monorepo branch `zali-milestone-4`; production Railway deployment still depends on the backend release path because the Railway CLI is not available locally.

### In Progress
- Sponsor flow remains separate from the shipped outside-user onboarding work.
- Client copy confirmations pending: refund policy, address-privacy answer, plan reassurance line ("Renews yearly. Cancel anytime." is placeholder)
- Backend gaps for full UI-lift data: resource `state` field + query param, release-date normalization

## Implementation History

### 2026-07-26 — Browse polish, letter gating, premium loading, and outside-user onboarding
**What was built:** Closed the main HeartLink Consumer polish pass after production feedback. Desktop browse columns now share the same top y-position and equal heights while preserving responsive/mobile behavior. The browse row is vertically balanced below the header/filter group. Desktop deck arrow controls were removed because swipe and Pass/Like are the intended controls. Signed-in refresh now holds on a branded loading state instead of flashing the public landing page. Profile images are cached/prioritized/prefetched across browse, profile, liked, sponsor, and landing surfaces. The liked screen no longer repeats heart badges on already-liked profiles. Outside-user onboarding now asks the intake-form questions that apply to non-inmate members and persists them through `matchPreferences`, including identity, connection, lifestyle, communication, story, and a separate "What I'm looking for" narrative.
**Why it mattered:** project lead asked for a premium, consistent, responsive consumer experience and specifically called out uneven browse columns, slow-feeling images, auth refresh flicker, redundant liked hearts, and missing non-inmate intake questions. The letter gate protects the paywall by requiring a liked/saved profile before writing.
**Verification:** Consumer `npx tsc --noEmit` and `npm run build:web` passed after each deployable pass. API `npm run build -- --filter=@heartlink/api` passed for the contract/service updates. The onboarding Impeccable audit found follow-up polish gaps, which were then fixed and redeployed. Production Vercel deploys succeeded; latest live check returned `200 OK` with bundle `entry-294b08cf0d5c4ef488b34dd57f441bc5.js`. Consumer commits through `6930a34` are pushed to `zali-ui-lift`. Backend commits for preference persistence and server-side letter gating are pushed to `zali-milestone-4`; Railway deployment remains external to this session.
**Files affected:** `app/(tabs)/index.tsx`, `app/(tabs)/liked.tsx`, `app/(tabs)/mailbox.tsx`, `app/(tabs)/profile.tsx`, `app/index.tsx`, `app/(onboarding)/onboarding.tsx`, `src/components/ProfileDeck.tsx`, `src/components/ProfileCard.tsx`, `src/components/StoryPanel.tsx`, `src/components/Landing.tsx`, `src/lib/api.ts`. Related backend files in the monorepo: `packages/api-contract/src/index.ts`, `apps/api/src/outside-profiles/outside-profiles.service.ts`, `apps/api/src/communications/communications.service.ts`, `apps/api/test/mailbox.e2e-spec.ts`.

### 2026-07-26 — Correspondence-first landing refinement + production deploy
**What was built:** Used AI coding tool Opus 5 to plan and implement the approved consumer landing refinement, then cleaned up and deployed it to production. The root layout no longer gates the public marketing page behind `<ClerkLoaded>`, so `/` paints while Clerk/auth resolves. The landing copy now frames HeartLink as private supported correspondence: thoughtful connection, real letters, honest conversations, trust over time, no swiping/no pressure. The first-view trust row now foregrounds verified profiles, private correspondence, safety-first communication, and real support. The hero product mockups were rebalanced away from pass/like dating mechanics toward profile review + "Write a letter" actions.
**Why it mattered:** project lead approved the direction after the Taste/Impeccable audit: keep the warm premium HeartLink feel, but reduce connection-platform energy and make the public page immediately visible instead of appearing blank during auth/runtime boot.
**Verification:** `npm run build:web` succeeded locally. Local exported build screenshots at desktop and mobile widths showed the public marketing hero visible after 1 second. Production deploy succeeded with `vercel deploy --prod --yes`; `vercel inspect https://heart-link-consumer.vercel.app` reported production status `Ready` and aliases applied. Production desktop and mobile Playwright screenshots after 1 second showed the updated marketing hero visible at https://heart-link-consumer.vercel.app.
**Files affected:** `app/_layout.tsx`, `app/index.tsx`, `src/components/Landing.tsx`. Production URL: https://heart-link-consumer.vercel.app.

### 2026-07-24 — Full UI lift (approved mockup ported to app code) + production deploys
**What was built:** Ported the entire approved UI-lift mockup (`internal design-reference/mockups/heartlink-ui-mockup.html`, handoff in `internal design-reference/mockups/UI-LIFT-HANDOFF.md`) into app code on branch `zali-ui-lift`. Desktop shell (midnight gradient rail, pink active pill, gold tagline, 1020px content column with glow background, no visible scrollbars); sign-in bridge-art panel + Clerk forgot-password flow; Luma-style account with plan columns (art bands, featured Diamond, "Most Popular" cap); gradient-pill Button primitive + Feather-only icons; mobile tab bar (pink pill active, Support moved to Account) and ValueProps retired from signed-in screens; branded empty states (mailbox, liked); level-2 screens (resources category detail, three support topic pages with locked verification copy, full Mindtrip profile surfacing PDF fields defensively from matchPreferences); desktop browse story panel with vitals strip (handles "Date not yet set"), swipe-app reference filter row, optically-centered deck where card clicks never navigate; all mockup micro-interactions (heartbeat Like, sliders rotate, hover lifts/zooms); enum-code prettifier + full state names; Notion-Mail two-column mailbox split rendered full-bleed. New shared pieces: `src/art.ts` (14-piece art registry in `assets/art/`), `src/lib/prefs.ts`, `src/components/{StoryPanel,EmptyState,profile-bits}.tsx`; new theme token groups `shell`, `auth`, `cta`, `colors.goldBright` (mirror in Flutter). `PREVIEW_BYPASS_AUTH` is now env-driven (`EXPO_PUBLIC_PREVIEW_BYPASS_AUTH`, default off; `.env.local` enables it for local review).
**Why it mattered:** This is the client-approved premium visual direction for the whole consumer surface; the previous UI was the pre-lift scaffold look.
**Verification:** `npx tsc --noEmit` clean throughout; every screen verified in-browser at desktop + mobile widths (plus 950px intermediate) with screenshots via Chrome; three production deploys verified live at https://heart-link-consumer.vercel.app including live-data checks with a real Clerk session (unknown release date renders "Date not yet set"). Found/fixed in verification: UTC date-parse showing wrong month, RNW `flex:0` → flex-basis 0% column collapse, filter-sheet header overflow, story-panel clipping at 900-1100px.
**Files affected:** `src/theme.ts`, `src/components/{AppNav,AuthShell,primitives,SubscriptionPlans,ProfileCard,ProfileDeck,FilterSheet,StoryPanel,EmptyState,profile-bits}.tsx`, `src/art.ts`, `src/lib/{prefs,preview}.ts`, `app/(tabs)/*` (all screens + layout), `app/(auth)/sign-in.tsx`, `app/_layout.tsx`, `assets/art/*`, `.env.local`, `internal design-reference/launch.json` (dev port 8091).

### 2026-07-22 — Production marketing landing pass + production deploy
**What was built:** Iteratively refined the marketing/landing experience (`src/components/Landing.tsx`) to project lead's approved final direction, then shipped it to production. The approved direction reconstructs the profile stack as in-surface stacked overlays rendered inside both the desktop browser panel and the phone window (rather than floating/detached cards). Mobile retains three controls including the second-look icon. Deployed to production with `vercel --prod --yes`, which succeeded.
**Why it mattered:** This is the first public production launch of the consumer surface. The landing page is the top-of-funnel marketing entry that hands users off to the app login, so getting the hero composition approved and live was the gate for sharing the site publicly.
**Verification:** `vercel --prod --yes` succeeded; site confirmed live at https://heart-link-consumer.vercel.app. Landing composition reviewed and approved by project lead across desktop and mobile breakpoints (including the in-surface stacked overlays and the mobile three-control layout with the second-look icon).
**Files affected:** `src/components/Landing.tsx` (approved landing composition). Production URL: https://heart-link-consumer.vercel.app.

### 2026-05-26 — Split from monorepo
**What was built:** The consumer app moved out of the HeartLink monorepo (`apps/consumer-app`) into its own standalone repo to escape npm workspace + React 18/19 + Expo install pathology. Code was copied 1:1 with two changes: (a) `@heartlink/api-contract` + `@heartlink/api-client` types inlined into `src/lib/api.ts`; (b) React pinned to 18.3.1 to match Expo 52's tested pair.
**Why:** ~6 hours of failed Vercel deploys against the monorepo (workspace hoisting + React version conflict + babel-preset-expo / metro resolution chain). Standalone Expo project is the Expo happy path; Vercel `vercel --prod` works on first try.
**Files affected:** Entire repo — every file under `app/` and `src/` plus all config (package.json, vercel.json, app.config.ts, babel.config.js, tsconfig.json).

### 2026-05-25 — Initial consumer scaffold (in monorepo)
**What was built:** Full M3 W9 consumer surface in `apps/consumer-app/` of the heart-link monorepo. Clerk auth, browse with filters, profile detail with photo gallery, brand theme, hover + keyboard nav.
**Why:** M3 W9 milestone deliverable — consumer UI sprint to ship before M3 acceptance gate Sun 2026-05-31. Code is sound; only the deploy mechanics failed in the monorepo context.
**Files affected:** Was at `heart-link/apps/consumer-app/*`. Code preserved in monorepo for reference until split-repo proves out.

## Architecture Evolution

Standalone Expo 52 + Expo Router 4 project. Single-page web app deployed as static bundle to Vercel. Reads only from the HeartLink Railway NestJS API (public `/api/profiles[/:id]` endpoints) using Clerk JWT for auth. No backend in this repo. See `architecture.md` for detail.

## Lessons Learned

- Monorepos with mismatched React majors (React 18 in Expo + React 19 in Next 16) cannot reliably share node_modules through npm workspaces. Hoisting + nested install both produce different failure modes (babel-preset-expo can't resolve `expo/config` when hoisted; metro internals break when nested).
- Expo's preferred deployment model is a standalone project. Fighting workspace integration costs more than vendoring shared types.
- Inline ~150 lines of TypeScript types beats sharing a workspace package when the API surface is small and stable.
