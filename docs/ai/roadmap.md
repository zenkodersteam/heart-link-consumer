# Roadmap

Forward-looking direction. Pair with `tasks.md` (active work) and `memory.md` (history).

## Vision

Public-facing consumer surface for HeartLink. Users sign in, browse verified inmate profiles, filter by age / state / facility / plan tier, view profile detail with photo gallery and bio. Built as Expo Web for MVP; iOS + Android are additive post-MVP via EAS Build with no rewrite required.

## Current Focus

**Theme:** Post-launch production monitoring + premium consumer polish after the consumer surface, correspondence-first landing, and outside-user onboarding are live in production.
**Goals:**
1. Keep the marketing funnel and login handoff healthy on production
2. Triage post-launch consumer + landing feedback (fix-now vs backlog)
3. Keep browse, liked, auth loading, images, and onboarding premium/responsive while preserving the approved correspondence-first framing

## Now

- Monitor production marketing funnel (https://heart-link-consumer.vercel.app) after the 2026-07-26 correspondence-first landing deploy
- Monitor production consumer feedback after the 2026-07-26 browse/onboarding polish deploy
- Sponsor flow follow-up remains separate from the shipped outside-user onboarding work

## Next

- Onboard test users onto the live consumer surface and gather first-run feedback
- Triage incoming consumer-side feedback (fix-now vs flag-for-W11)
- Deploy/verify HeartLink monorepo backend changes for liked-before-letter API enforcement and outside-user `matchPreferences` persistence if Railway has not auto-deployed `zali-milestone-4`
- Confirm M3 acceptance sign-off is invoiced and closed out

## Later

- Stripe checkout (M4 W10-11) — requires API contract update on the admin side first; PayPal decision still open
- Favorites / saved profiles (M4 W11) — needs new `saved_profiles` API endpoint
- Transactional emails — M4 W11, post-Stripe
- iOS + Android via EAS Build — post-MVP (~3-4 weeks of additive work)

## Recently Completed

- Browse layout polish, premium auth/image loading, liked-screen cleanup, liked-before-letter UX gate, and expanded outside-user onboarding from applicable intake-form questions — deployed to production; latest live bundle `entry-294b08cf0d5c4ef488b34dd57f441bc5.js` — 2026-07-26
- Correspondence-first marketing landing refinement — approved by project lead; deployed to production with immediate public first paint, Clerk/auth no longer blanks `/`, first-view trust bar emphasizes verified profiles/private correspondence/safety-first support, and hero mockups lead with "Write a letter" instead of dating/swipe mechanics — 2026-07-26
- Production marketing landing pass — approved by project lead; in-surface stacked profile overlays in the desktop browser panel + phone window, mobile keeps three controls incl. second-look icon — 2026-07-22
- First production deploy — `vercel --prod --yes` succeeded, live at https://heart-link-consumer.vercel.app — 2026-07-22
- Consumer app scaffold (auth, browse, detail, theme, hover + keyboard nav) — 2026-05-25
- Split-repo migration — 2026-05-26
- Inlined API types — 2026-05-26

## Deferred / Cancelled

- Card-stack swipe gestures — deferred to post-MVP. The "swipe-based discovery" client direction (2026-05-12) is honored as card layout + monetization vision, not as a literal swipe gesture for web MVP.
- Push notifications — post-MVP (native only).
- Biometric auth — post-MVP (native only).
- Native camera for self-portrait — post-MVP.
