# Tasks

Active work for the consumer repo. Update as items complete.

## Just Landed (2026-07-26)

Consumer polish and outside-user onboarding shipped to production. Browse desktop columns now align at equal top y and matched height with responsive top/bottom breathing room; desktop arrows were removed while swipe and Pass/Like remain; liked-screen duplicate heart badges were removed; signed-in refresh uses a branded loading state instead of flashing the public home page; profile imagery is cached/prioritized/prefetched for a snappier premium feel. Outside-user onboarding now covers applicable intake-form questions and the Impeccable follow-up pass fixed responsive progress, loading/error states, accessibility semantics, review completeness, and the separate "What I'm looking for" narrative field. Verified with `npx tsc --noEmit`, `npm run build:web`, API build for related backend contract/service changes, production Vercel deploy, and live `200 OK`.

## Just Landed (2026-07-26)

Correspondence-first marketing landing refinement approved by project lead and deployed to production at https://heart-link-consumer.vercel.app. `/` now renders while Clerk/auth is still loading instead of blanking the public page; landing copy and mockups now emphasize private supported correspondence, verified profiles, safety-first communication, real support, and "Write a letter" rather than swipe/dating mechanics. Verified with `npm run build:web`, local desktop/mobile 1-second screenshots, `vercel deploy --prod --yes`, `vercel inspect`, and production desktop/mobile 1-second screenshots.

## Just Landed (2026-07-24)

Full UI lift implemented from the approved mockup and deployed to production (three deploys, last verified live with real data). Every handoff item shipped: shell, sign-in, account/plans, buttons/badges, mobile tab bar (+ValueProps retired), empty states, level-2 screens (resources category detail, 3 support topic pages, full Mindtrip profile), browse story panel + deck rules, all micro-interactions, responsive fixes, enum-label/state-name formatting, Notion-Mail mailbox split (full-bleed). `PREVIEW_BYPASS_AUTH` is now env-driven and defaults off. Working tree on `zali-ui-lift` is uncommitted (GitHub Desktop review flow) and also carries a parallel session's sponsor/onboarding work.

## Sprint / Iteration

**Range:** post-launch (from 2026-07-22)
**Goal:** UI lift shipped; close remaining copy + backend gaps, keep production consumer polish premium and responsive.

## In Progress

- [ ] Sponsor flow follow-up (separate from outside-user onboarding; do not conflate with shipped member onboarding polish)
- [x] Post-launch landing/marketing refinement based on live feedback — correspondence-first public page; no blank auth-loading first paint; deployed production 2026-07-26
- [x] Browse layout, premium loading/images, liked-screen cleanup, and outside-user onboarding polish — deployed production 2026-07-26

## Up Next

- [ ] Backend release follow-through: deploy/verify the pushed HeartLink monorepo changes for server-side liked-before-letter enforcement and outside-user `matchPreferences` persistence if Railway has not auto-deployed `zali-milestone-4`
- [ ] Client copy confirmations: refund policy, address-privacy answer, plan reassurance line
- [ ] Backend: resource `state` field + query param, release-date normalization + has_release_date
- [ ] Advanced filter tab (Bumble sheet) once the API grows the filter params
- [ ] Admin: deactivate internal test profile "Marcus Johnson" visible in prod browse (not this repo)
- [ ] Triage post-launch consumer + landing feedback (fix-now vs backlog)

## Blocked

(none)

## Recently Completed

- [x] Browse column alignment/equal-height responsive polish — deployed + verified live — 2026-07-26
- [x] Auth refresh flicker and image-loading premium pass — deployed + verified live — 2026-07-26
- [x] Liked-screen redundant heart badge cleanup — deployed + verified live — 2026-07-26
- [x] Letter-writing gated behind liked/saved profiles in consumer UX/direct compose route — deployed consumer; backend guard pushed in monorepo — 2026-07-26
- [x] Outside-user onboarding expanded from applicable intake-form questions and polished via Impeccable audit — deployed + verified live — 2026-07-26
- [x] Correspondence-first marketing landing refinement — approved by project lead, deployed + verified live; root page renders before Clerk/auth finishes loading — 2026-07-26
- [x] Full UI lift (shell, sign-in, account, badges, mobile tabs, empty states, level-2 screens, browse story panel, micro-interactions, responsive) — deployed + verified live — 2026-07-24
- [x] Env-driven preview bypass (`EXPO_PUBLIC_PREVIEW_BYPASS_AUTH`, default off; `.env.local` for local review) — 2026-07-24
- [x] Mockup art moved to `assets/art/` with tokenized registry `src/art.ts` — 2026-07-24
- [x] Production marketing landing pass — approved by project lead (in-surface stacked profile overlays in desktop browser panel + phone window; mobile keeps three controls incl. second-look icon) — 2026-07-22
- [x] Production deploy — `vercel --prod --yes` succeeded, live at https://heart-link-consumer.vercel.app — 2026-07-22
- [x] Repo scaffold (Expo Router structure, 6 routes, 4 components, 5 lib modules) — 2026-05-26
- [x] Inlined API types from monorepo's `@heartlink/api-contract` — 2026-05-26
- [x] `vercel.json` configured for Expo Web static export — 2026-05-26
- [x] Code-map docs written (CODE_MAP / ENTRY_POINTS / DATA_FLOW / IMPORT_GRAPH_SUMMARY / FEATURE_BOUNDARIES) — 2026-05-26
- [x] AI context docs scaffolded (memory / roadmap / tasks / decisions / architecture / llms.txt) — 2026-05-26

## Bugs

(none open) - watching production for post-launch issues; log new bugs here as they surface.

## Tech Debt

- [ ] **Manual API type sync.** `src/lib/api.ts` is vendored from the monorepo's `@heartlink/api-contract`. When the admin API contract changes (new fields on `PublicProfileSummary`, new filters, etc.), update this file by hand. P3 — admin API is stable for the public surface.
- [ ] **No automated tests yet.** Component + integration tests still deferred. Web smoke is manual against the live production URL. P3.
- [ ] **No ESLint / Prettier config.** Carry over the monorepo's config or set up fresh. P3.
- [ ] **No CI workflow.** GitHub Actions for type-check + build verification not yet added. P3 — Vercel build is the de-facto CI for now.
- [ ] **`@expo/metro-runtime` pin and other Expo peers** — currently using semver `~` ranges. If Expo SDK 53 lands a different baseline, consider pinning exact versions to prevent drift. P3.

## Redeploy Checklist (post-launch)

Live at https://heart-link-consumer.vercel.app. First deploy completed 2026-07-22; use this to ship subsequent changes.

1. [ ] `npm run build:web` produces `dist/index.html` + assets locally
2. [ ] Commit + push the change
3. [ ] `vercel --prod --yes` from repo root
4. [ ] Smoke the live URL: sign in, browse renders, card → detail loads, sign out — no console errors
