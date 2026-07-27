# Architecture Decisions

ADR log for the standalone consumer repo. Higher-level architectural decisions for HeartLink as a whole live in the main monorepo's `docs/ai/decisions.md` (ADR-001 through ADR-020+).

---

## ADR-007: Outside-user onboarding mirrors only applicable intake-form questions

**Date:** 2026-07-26
**Status:** Accepted

**Context**

HeartLink Consumer needs onboarding for non-inmate/outside users. project lead asked that the flow ask the same intake-form questions that apply to them, using the client asset at `the `heart-link` repository\docs\client-assets\intake-form-rebuild-2026-07-21`, without importing inmate-only facility, incarceration, payment, or message-ID fields.

**Decision**

The outside-user onboarding flow will collect applicable relationship/profile context in grouped steps: Identity, Connection, Lifestyle, Communication, Story, What I'm looking for, optional Photo, and Review. The answers persist as `outside_user_profiles.match_preferences` through the HeartLink API contract/service, while core profile fields remain display name, date of birth, location, bio, and photo.

**Consequences**

- **Positive:** Non-inmate onboarding now reflects the real intake language and gives moderation/future matching richer profile context.
- **Positive:** Inmate-only fields stay out of the consumer flow, keeping the member experience focused and avoiding irrelevant/private facility data collection.
- **Positive:** The review step shows all captured categories before submission, improving trust and completeness.
- **Negative:** `matchPreferences` remains a flexible JSON surface that must be kept in sync manually between this standalone consumer repo and the HeartLink monorepo API contract.
- **Neutral:** Backend preference persistence was pushed to `zali-milestone-4`; production API availability depends on the backend release path.

**Alternatives considered**

- Copy the whole intake form verbatim — rejected because inmate/facility/payment fields do not apply to outside users.
- Keep only name/location/bio/photo — rejected because it misses the applicable connection and preference data project lead asked to capture.

---

## ADR-001: Split consumer app into its own repo

**Date:** 2026-05-26
**Status:** Accepted

**Context**

The consumer app was originally a workspace in the HeartLink monorepo (`apps/consumer-app`). Deploying it to Vercel from the monorepo failed repeatedly across six attempts on 2026-05-26:

1. `expo/config` could not be resolved by the hoisted `babel-preset-expo`
2. npm `--install-strategy=nested` produced a broken metro version split
3. Unifying React versions (consumer 18 → 19) broke `react-helmet-async` peer deps inside `expo-router@4`
4. Various flag combinations (`--legacy-peer-deps`, etc.) shifted the failure mode without resolving it

Root cause: the monorepo holds React 18 (consumer, required by Expo 52) and React 19 (admin-web, required by Next 16). npm workspaces cannot hoist React, so consumer's deps stay nested while `babel-preset-expo` gets hoisted to root — Node's CJS resolver can't bridge that split. Expo's build pipeline assumes a flat-ish single-React node_modules.

**Decision**

Move the consumer app into its own repo at `the sibling `heart-link-consumer` repository`. Inline the small public-API surface from `@heartlink/api-contract` and `@heartlink/api-client` into `src/lib/api.ts`. Deploy the standalone repo to Vercel as a normal Expo Web project.

**Consequences**

- **Positive:** Vercel deploy works on first try; no workspace install pathology; clean Expo dev experience; faster local iteration.
- **Positive:** Admin and consumer can move at independent cadences without npm fighting them.
- **Negative:** Two repos to maintain. API type changes require manual sync of `src/lib/api.ts` from the monorepo.
- **Negative:** Diverges from the monorepo principle in the parent project's ADR-002. Documented and accepted.
- **Neutral:** No shared CI between the two repos. Each has its own Vercel project.

**Alternatives considered**

- Force everything to React 19 — broke CI (`expo-router@4` transitive `react-helmet-async@1.x` doesn't support React 19).
- Force `--install-strategy=nested` — broke metro internals via version split.
- Add `expo` + `babel-preset-expo` to root devDeps to force hoisting — would create peer conflicts with admin's React 19.
- Deploy via static prebuilt upload — viable as a one-off but doesn't fix the dev experience.

---

## ADR-002: Inline API types instead of sharing a workspace package

**Date:** 2026-05-26
**Status:** Accepted

**Context**

ADR-001 splits the repo. The consumer only consumes the public profile browse surface: `PublicProfileSummary`, `PublicProfileDetail`, `PublicProfilePhoto`, `PublicProfileFacility`, `PlanTier`, `ListPublicProfilesQuery`, `ListPublicProfilesResponse` — about 50 lines of TypeScript types. Plus a typed fetch wrapper of ~80 lines.

**Decision**

Vendor the relevant types + client code into `src/lib/api.ts` in this repo. Re-sync manually when the admin API contract changes.

**Consequences**

- **Positive:** No npm dependency on `@heartlink/*` packages; no monorepo coupling; no publish step.
- **Positive:** All types in one file (`src/lib/api.ts`) makes the contract surface obvious to any new dev.
- **Negative:** Drift risk — if the admin API adds a field and we forget to sync, type errors surface at runtime (untyped JSON parse) instead of at compile time.
- **Mitigation:** Keep `src/lib/api.ts` as the single inlining point. Never inline a type directly into a component file.

**Alternatives considered**

- Publish `@heartlink/api-contract` to npm — adds a publish step + version coordination overhead.
- Git submodule pointing at the monorepo's `packages/api-contract` — fragile across two repos, weird DX.
- Generate types from an OpenAPI schema — admin API doesn't expose one yet; this is a future option.

---

## ADR-003: Web-first MVP; native iOS/Android post-MVP

**Date:** 2026-05-25 (reaffirmed in this repo 2026-05-26)
**Status:** Accepted

**Context**

The HeartLink MVP contract delivers a web bundle. Native iOS/Android is post-MVP work (~3-4 weeks of additive EAS build configuration + platform-specific code per the parent monorepo's roadmap). The 2026-05-12 client direction called for "swipe-based discovery" which on web translates poorly (click/drag UX is awkward).

**Decision**

Build for Expo Web first. Treat swipe gestures, push notifications, biometrics, and native camera as post-MVP. Use responsive grid + keyboard nav + hover states for the web experience instead of swipe.

**Consequences**

- **Positive:** Single deploy target (Vercel). No EAS Build complexity during MVP. No App Store / Play Store gating critical-path work.
- **Positive:** Desktop testing is trivial — open the URL.
- **Negative:** "Swipe-based" experience client envisioned is approximated, not literal. Native version delivers it post-MVP.
- **Neutral:** `react-native-gesture-handler` + `react-native-reanimated` are installed (degrade fine on web) and ready for post-MVP gesture work.

**Alternatives considered**

- Build native first — contract is web-first; native is additive.
- Drop RN entirely and write a pure web app — would throw away the post-MVP native path.

---

## ADR-004: Use Clerk's single instance shared with the admin app

**Date:** 2026-05-26
**Status:** Accepted

**Context**

The HeartLink admin-web app already uses a Clerk instance. The consumer app needs auth. Two options: separate Clerk instance per app, or share one instance with role-based routing (per the parent monorepo's ADR-010).

**Decision**

Use the same Clerk instance. Consumer signs up users with the default `outside_user` role; admin uses `admin` / `ops_staff` / `billing` / `moderator` roles. Same publishable key (exposed as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` here, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in admin).

**Consequences**

- **Positive:** Single user identity across both surfaces if a user ever needs both (rare, but possible — e.g., a staff member who also browses).
- **Positive:** Single Clerk dashboard to manage. Single billing line.
- **Positive:** Reuses the parent monorepo's ADR-010 RBAC model with no changes.
- **Negative:** Consumer's allowed origins list must include both admin + consumer URLs in the Clerk dashboard. Don't forget when deploying the consumer.

**Alternatives considered**

- Separate Clerk instance per app — doubles cost and complicates any future cross-surface flow.

---

## ADR-005: Adopt the client-delivered light theme + deck-style browse

**Date:** 2026-06-09
**Status:** Accepted

**Context**

The client delivered a 10-screen design set (`docs/screens_from_client` in the admin monorepo) on 2026-06-09 and asked to build to it. The screens are a warm light/blush theme with a deep-purple navigation rail, and they present browse as a swipe-style single-card deck (swipe + Pass / Second Look / Like). This reverses two earlier consumer decisions: the dark Deep Midnight Purple theme from the 2026-05-18 brand book, and ADR-003's "approximate swipe with a grid on web."

The client also clarified that "functional on mobile" means usable in a phone browser, not native iOS/Android.

**Decision**

1. Flip the consumer theme to light. `src/theme.ts` keeps stable token keys (so components inherit the change) with new values: blush surfaces, white cards, deep-purple `sidebar*` tokens for the rail, deep-purple text, Hot Heart Pink primary, gold accents. Bree Serif + Inter retained.
2. Replace the grid Home with a swipe deck (`ProfileDeck`) built on PanResponder + Animated (built-in, reliable on RN Web) rather than reanimated worklets. Buttons (Pass / Second Look / Like) are the primary control; swipe is the enhancement. This supersedes ADR-003's grid-only web stance for browse.
3. Responsive shell: deep-purple left sidebar on desktop widths, white bottom tab bar + top wordmark on mobile. Nav: Home, Liked, Resources, Support, Account.
4. Add a gender filter (Men / Women / Both) per the client screens. Requires a new `profiles.gender` column in the admin DB (migration `0002_consumer_gender.sql`), populated on profile auto-create from the intake OCR `sex` field and backfilled for existing rows.

**Consequences**

- **Positive:** Design ambiguity removed; the app matches the client's intended look and the swipe interaction they asked for.
- **Negative:** The just-shipped dark consumer app is reworked to light (rework on accepted work).
- **Negative:** Gender filter needs the admin migration applied + a backfill, and demo profiles need gender values to show results (see ADR-006 + the migration header).
- **Neutral:** Swipe deck works in mobile browsers; native gesture polish remains post-MVP.

**Alternatives considered**

- Keep the dark brand-book theme — contradicts the delivered screens the client chose.
- Keep grid-only browse — the screens are explicitly a swipe deck.

---

## ADR-006: Scope held at MVP — features deferred from the client screens

**Date:** 2026-06-09
**Status:** Accepted

**Context**

The 2026-06-09 client screens include several features that fall outside the signed MVP scope. Decision (project lead): hold the MVP line and adopt the visual design, but record what was deliberately left out so it does not silently become an expectation.

**Decision — deferred (NOT built for MVP):**

1. **In-app secure messaging / Mailbox** (screen 7; "Message" buttons on screen 8). The contract excludes in-app messaging and the digital mailbox (Phase 4). Messaging with incarcerated people also carries facility-monitoring / compliance exposure that an "end-to-end encrypted" inbox would misrepresent. The MVP shows no Mailbox nav and no Message buttons. Outbound contact remains the planned PostGrid letter flow (admin side, M4), not consumer chat.
2. **Google SSO + phone-number login** (screen 10). The 2026-05-12 client decision is email/password only for MVP. The welcome/auth screens offer Create Account + email/password sign-in only.
3. **Dynamic Resources directory with search + organization backend** (screen 9 search bar). MVP ships a static, curated Resources page (category cards + a Contact Support CTA). The searchable, backend-driven directory is deferred.
4. **"Accepts Mail" and other profile fields not in the public API** (screen 3). Only fields the public profile API returns are shown. "Verified Profile" is displayed as a constant (every public profile is verified/approved by definition).

**Consequences**

- **Positive:** MVP stays on-scope and on-budget; no compliance exposure from a messaging subsystem.
- **Action required:** Confirm these deferrals with the client at the demo so the design hand-off and acceptance gate reflect them. Track any client-requested additions as change orders.

---
