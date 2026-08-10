# Support Circle Phase 0 — Implementation Report

**Date:** 2026-08-10
**Scope:** Phase 0 demo slice per `docs/ai/support-circle-roadmap.md` and `.hermes/plans/20260810-1312-support-circle-implementation-plan.md`
**Status:** Implemented, verified, not committed.

---

## 1. What shipped

A signed-in Support Circle surface at `/circle`, built entirely from local typed content with no API call, no write path, and no member-to-member visibility of any kind.

Four levels, all local `useState`, no router params:

1. **Landing.** Midnight hero, a hairline-separated list of six writing moments, a "Before you send" panel, the moderated-groups future block, a privacy footnote, and a quiet pointer to Resources for anything clinical or legal.
2. **Moment.** Intro framing plus that moment's prompts as a list.
3. **Prompt.** The prompt set as a page of stationery: gold rule, serif body at reading size, a "Why this works" note, and a web-only copy action.
4. **Before you send.** Mailroom reject/instead pairs, plan word limits, and the pre-send checklist.

**Content:** 6 moments, 18 prompts, 5 mailroom rules, 3 plan limits, 7 checklist items. All HeartLink-authored.

---

## 2. Design decisions worth flagging

**The screen deliberately does not copy the `resources.tsx` art-tile grid.** That 2x2 photo-tile pattern is already spent twice in this app (Resources, Support). A third instance would read as a clone screen with new nouns, which is the most common way a surface like this gets read as generic. Support Circle inherits the *shell* (scroll padding, breadcrumb, level-2 drill-in, theme tokens) and replaces the *structure* with an editorial one: one piece of art on the whole surface, hairline-separated lists, and a stationery panel for the prompt itself.

Supporting rules held throughout:

- **Gold carries authorship, pink carries action.** The moment icons, the prompt rule, and the future-block border are gold. Pink is reserved for the single active/hover affordance and links.
- **One pink glow on the page**, in the hero, matching the locked art direction.
- **No new art.** Reuses `art.supportHero`. No per-prompt imagery, which is where this would have gone cheap fastest and would also have grown the bundle.
- **The future block is the quietest element on the page**, not the loudest: no fill, no shadow, no button, no email capture, no date. It reads as a hairline-separated note rather than a CTA band, because a CTA band would imply an action that does not exist.
- **The "Why this works" label uses `textSecondary`, not gold.** Gold at 11.5px on white fails 4.5:1; gold is used only for the icon glyphs and 1px rules, where the 3:1 non-text threshold applies.
- **Word limits render as a compact table, not three plan cards.** Plan cards would read as an upsell inside safety content.
- No emoji, no unicode-glyph icons, no fake member counts, no avatars, no "join / community / feed / chat / match" language.

**Copy safety.** Every roadmap content rule is enforced and restated as a docblock at the top of the content module: no prompt solicits identifying information, none encourages promises, money, or legal discussion, the hard-news moment links out to Resources rather than counseling, and no new verification claim appears anywhere. The locked verification copy is untouched.

---

## 3. Route collision

The plan flagged that `/support-circle` would collide with `AppNav`'s `isActive`, which uses `pathname.startsWith(item.match)` — `/support-circle` would light the Support nav pill as well.

**Resolved by choosing `/circle`**, per the plan's own recommendation. `isActive` is left unchanged, so there is no regression risk to the five existing nav items. No other route in the app begins with `/circle`.

---

## 4. Files

### New

| Path | Purpose |
| --- | --- |
| `src/lib/support-circle-content.ts` | Typed content: `Moment`, `Prompt`, `MailroomRule`, `PlanWordLimit`. Pure helpers `findMoment`, `findPrompt`, `wordLimitForPlan`, plus `TOTAL_PROMPT_COUNT`. No React import, so it ports cleanly to the Flutter app. |
| `app/(tabs)/circle.tsx` | The screen: landing, moment, prompt, and letter-support levels. |

### Modified

| Path | Change |
| --- | --- |
| `src/components/AppNav.tsx` | Added the `circle` entry to `NAV_ITEMS` (label "Support Circle", short "Circle", icon `edit-3`, path/match `/circle`). Filtered out of `TAB_ITEMS` alongside `support`, so the mobile bottom bar keeps its approved five-item density. |
| `app/(tabs)/account.tsx` | Added a "Not sure what to write? → Open Support Circle" row above the existing Support row. This is the mobile entry point. |
| `app/(tabs)/support.tsx` | Added `useRouter` and a quiet pointer link under Popular questions, plus its two styles. Support answers the app; Support Circle answers the blank page. |

### Untouched, as required

`src/lib/api.ts`, `src/theme.ts`, `src/art.ts`, `src/components/primitives.tsx`, `assets/art/*`, `package.json`. No new dependencies. No backend change of any kind.

---

## 5. Verification

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean. One error on the first run (`TS2440`: a local `View` type shadowing the React Native import) was fixed by renaming the type to `Level`; the rerun is clean. |
| `npm run build:web` | Succeeded. `Exported: dist`, single web bundle 2.78 MB. |
| `node <impeccable>/scripts/detect.mjs --json "app/(tabs)/circle.tsx"` | 3 advisory findings, no warnings or errors. All three are the midnight gradient literals `#1B0826`, `#3A1550`, and `rgba(22,5,31,0.82)`, copied verbatim from the existing `support.tsx` and `resources.tsx` hero treatments. Left as-is: matching the incumbent hero is the correct call, and changing them would fork the pattern to satisfy a linter. |

**Motion and accessibility:** the level transition respects `prefers-reduced-motion` via the same `useReduceMotion` helper used in `resources.tsx`. All interactive rows carry `accessibilityRole="button"`, and the moment rows carry an `accessibilityLabel` including the prompt count.

**Not run:** no browser screenshot pass at 375 / 768 / 950 / 1280. The layout uses only flex, hairline dividers, `flexWrap`, and `maxWidth` caps on text blocks, with no fixed widths except the two short label columns in the word-limit table (84px and 92px, which fit "Diamond" and "350 words" at the app's type sizes). It should hold, but that is reasoned, not observed. Worth one look before the client call.

---

## 6. Caveats and open items

1. **Plan word limits are hardcoded** (Basic 200 / Diamond 300 / VIP 350) to match the locked Support copy. The Stripe task has not landed final live plan products. Confirm the names and limits before treating this surface as authoritative; a comment in the content module says so.
2. **`wordLimitForPlan` is exported but not yet called by any screen.** It exists because Phase 1's compose handoff will need it, and because it is the cheapest thing in this feature to unit test. It defaults to the most restrictive limit (200) for an unknown plan so a wrong plan can never over-promise length.
3. **Do not pitch this as fixing deliverability on the call.** PostGrid production activation is still blocked by a 403. The letter-support content only pays off once letters actually mail in production.
4. **The copy action is web-only.** No clipboard dependency was added, so the button renders only where `navigator.clipboard` exists, rather than shipping a button that silently fails on native. If native copy is wanted later, that is an `expo-clipboard` decision, not a UI one.
5. **No tests.** The repo has no test runner, no ESLint, and no CI. Per the plan's Option A, the demo ships verification-first. The content module was written to be the cheapest place in the codebase to start testing; the highest-value single test remains the content guardrail (no prompt body contains an address, phone, email, or money-request pattern).
6. **The Expo screen may be throwaway.** If the Flutter app becomes the shipping surface, `src/lib/support-circle-content.ts` is the portable artifact. It was written with no React import for exactly that reason.
7. **Docs not updated.** `docs/ai/tasks.md` and `docs/ai/decisions.md` were left alone. Per the roadmap, the Phase 0 task entry and the ADR (editorial before social; pre-moderation when member content exists; never a member-to-member contact channel) should be added after client approval.
8. **Nothing was committed or pushed**, as instructed.
