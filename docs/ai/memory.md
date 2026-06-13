# Project Memory

Running history of what's been built and current state. Update after major changes.

## Current State

**Status:** Active Development — pre-first-deploy
**Last Updated:** 2026-05-26
**Version:** pre-0.1.0

### What's Working
- Repo scaffolded with full Expo Router 4 structure (6 routes, 4 components, 5 lib modules)
- Clerk auth wired (sign-in, sign-up with email-code verification, token cache for web + native)
- Profile browse screen with responsive 1-4 column grid, hover + keyboard nav (web only)
- Profile detail screen with hero photo + thumbnail strip + bio + facility info
- Filter sheet covering age / state / facility / plan tier (per 2026-05-12 client direction)
- Brand theme: Deep Midnight Purple bg, Hot Heart Pink primary, Metallic Gold accent, Bree Serif + Inter

### Known Issues
- Not yet deployed — first `npm install` + `npm run web` smoke test pending
- No `.env` file yet (only `.env.example`)
- No Vercel project linked yet
- API types inlined from monorepo (`src/lib/api.ts`); manual sync required when admin API contract changes
- Smoke test of `expo export --platform web --output-dir dist` not yet run locally

### In Progress
- First local install + build verification
- First Vercel deploy

## Implementation History

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
