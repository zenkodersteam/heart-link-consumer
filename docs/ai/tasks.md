# Tasks

Active work for the consumer repo. Update as items complete.

## Sprint / Iteration

**Range:** 2026-05-26 to 2026-05-31
**Goal:** First successful Vercel deploy + M3 acceptance.

## In Progress

- [ ] First `npm install` from repo root — Zaire — local smoke after the split
- [ ] First `npm run web` to verify the dev server boots cleanly
- [ ] First `npm run build:web` to verify the production export succeeds locally

## Up Next

- [ ] Create `.env` from `.env.example` — paste Clerk pk_test key + Railway API base URL
- [ ] Create new Vercel project — import this repo, Root Directory = `./`, env vars set
- [ ] Set Vercel Deployment Protection on (mirror admin pattern)
- [ ] Add new Vercel preview + production URLs to Clerk allowed origins
- [ ] `vercel --prod` first deploy
- [ ] End-to-end smoke against live deploy: sign up → email code → land on browse → tap card → detail → back → sign out
- [ ] Send live URL to client for M3 acceptance walkthrough
- [ ] Flip Clerk email allowlist on the dev instance before broad sharing

## Blocked

(none)

## Recently Completed

- [x] Repo scaffold (Expo Router structure, 6 routes, 4 components, 5 lib modules) — 2026-05-26
- [x] Inlined API types from monorepo's `@heartlink/api-contract` — 2026-05-26
- [x] `vercel.json` configured for Expo Web static export — 2026-05-26
- [x] Code-map docs written (CODE_MAP / ENTRY_POINTS / DATA_FLOW / IMPORT_GRAPH_SUMMARY / FEATURE_BOUNDARIES) — 2026-05-26
- [x] AI context docs scaffolded (memory / roadmap / tasks / decisions / architecture / llms.txt) — 2026-05-26

## Bugs

(none observed yet — pre-first-deploy)

## Tech Debt

- [ ] **Manual API type sync.** `src/lib/api.ts` is vendored from the monorepo's `@heartlink/api-contract`. When the admin API contract changes (new fields on `PublicProfileSummary`, new filters, etc.), update this file by hand. P3 — admin API is stable for the public surface.
- [ ] **No automated tests yet.** Component + integration tests deferred until after first deploy. Web smoke is manual against the live URL. P3.
- [ ] **No ESLint / Prettier config.** Carry over the monorepo's config or set up fresh. P3.
- [ ] **No CI workflow.** GitHub Actions for type-check + build verification not yet added. P3 — Vercel build is the de-facto CI for now.
- [ ] **`@expo/metro-runtime` pin and other Expo peers** — currently using semver `~` ranges. If Expo SDK 53 lands a different baseline, consider pinning exact versions to prevent drift. P3.

## Deploy Checklist (one-shot for first deploy)

1. [ ] `npm install` succeeds locally (Windows is fine)
2. [ ] `npm run web` opens at `http://localhost:8081`, renders sign-in screen, fonts load
3. [ ] Sign up with a test email, verify code, land on browse
4. [ ] Browse renders profiles (or empty state) — no console errors
5. [ ] Tap a card → detail loads
6. [ ] Account tab → sign out → back to sign-in
7. [ ] `npm run build:web` produces `dist/index.html` + assets
8. [ ] `git add . && git commit -m "Initial scaffold" && git push`
9. [ ] Create new Vercel project from this repo
10. [ ] Set env vars in Vercel dashboard
11. [ ] `vercel --prod` from repo root
12. [ ] Open the production URL, repeat steps 3-6 against live
