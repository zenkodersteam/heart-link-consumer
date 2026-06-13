# Roadmap

Forward-looking direction. Pair with `tasks.md` (active work) and `memory.md` (history).

## Vision

Public-facing consumer surface for HeartLink. Users sign in, browse verified inmate profiles, filter by age / state / facility / plan tier, view profile detail with photo gallery and bio. Built as Expo Web for MVP; iOS + Android are additive post-MVP via EAS Build with no rewrite required.

## Current Focus

**Theme:** Ship consumer surface for M3 acceptance gate.
**Goals:**
1. First successful Vercel production deploy of this repo
2. End-to-end smoke against the live Railway API (sign up → browse → detail → sign out)
3. Be ready for client test-user onboarding from Mon 2026-06-01

## Now

- First deploy + smoke test — in flight
- Verify Clerk allowed origins include the new Vercel URL — pending
- Confirm Railway API CORS accepts the new origin (should be open via `app.enableCors()`) — pending

## Next

- M3 acceptance gate (Sun 2026-05-31) — written sign-off, invoice $5,100
- M4 W10 start (Mon 2026-06-01) — client onboards test users on the live consumer surface
- Triage incoming consumer-side feedback (fix-now vs flag-for-W11)

## Later

- Stripe checkout (M4 W10-11) — requires API contract update on the admin side first; PayPal decision still open
- Favorites / saved profiles (M4 W11) — needs new `saved_profiles` API endpoint
- Transactional emails — M4 W11, post-Stripe
- iOS + Android via EAS Build — post-MVP (~3-4 weeks of additive work)

## Recently Completed

- Consumer app scaffold (auth, browse, detail, theme, hover + keyboard nav) — 2026-05-25
- Split-repo migration — 2026-05-26
- Inlined API types — 2026-05-26

## Deferred / Cancelled

- Card-stack swipe gestures — deferred to post-MVP. The "swipe-based discovery" client direction (2026-05-12) is honored as card layout + monetization vision, not as a literal swipe gesture for web MVP.
- Push notifications — post-MVP (native only).
- Biometric auth — post-MVP (native only).
- Native camera for self-portrait — post-MVP.
