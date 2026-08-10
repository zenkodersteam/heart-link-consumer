# Support Circle / Supporter Hub Roadmap

Post-MVP feature direction for the HeartLink consumer app. Pair with `docs/ai/roadmap.md` (overall direction), `docs/ai/tasks.md` (active work), and `docs/ai/decisions.md` (ADR log).

**Status:** Planning only. No product code exists for this feature.
**Audience:** outside/consumer users only (non-inmate members). There is no inmate-facing digital surface anywhere in this plan.
**Last updated:** 2026-08-10

---

## 1. What this is

Support Circle (surface name: Supporter Hub) is a private, guided space for outside members who are writing to someone inside. It answers the question members actually have, which is not "who else is here" but "what do I say, and am I doing this right."

Three pillars, in the order they ship:

1. **Guided prompts.** A curated library of writing prompts and conversation starters, organized by moment (first letter, after a long gap, before a court date, holidays, hard news, encouragement). Prompts are HeartLink-authored, reviewed copy. Not user-generated.
2. **Letter-writing support.** Practical scaffolding around the existing letter flow: what mailrooms reject, length by plan tier, tone guidance, a pre-send checklist, and a way to carry a chosen prompt into the compose screen.
3. **Moderated supporter groups (future).** A slow, staged path toward supporters hearing from each other, starting with fully curated, read-only content and only later admitting member-authored contributions behind moderation.

### What this is explicitly not

- Not a public forum, not Facebook Groups, not a feed, not DMs between members.
- Not a dating or social-media surface. HeartLink is private supported correspondence, and Support Circle inherits that framing.
- Not an inmate-facing product. Profiles originate as mailed paper applications; nothing in Support Circle changes that.
- Not a place where HeartLink gives legal, medical, or clinical advice. Resources link out; Support Circle does not counsel.

### Why the reframe from "forum"

The inspiration is a forum for outside supporters. A full open forum is the wrong first move for three reasons: it needs moderation staff before it needs code, it creates a place where members can arrange third-party contact outside the letter pipeline (the exact thing facility mailrooms police), and it is a liability surface that grows with usage rather than shrinking. Support Circle takes the same member need (I feel alone in this, tell me how to do it) and serves it first with editorial content, which is demoable in days and safe by construction.

---

## 2. Phases

### Phase 0 — Demo slice (client-call ready)

**Goal:** something real and clickable in the consumer app that carries the idea, built entirely from local content with no new API dependency.

Scope:
- A new signed-in surface, `Support Circle`, following the existing level-2 pattern used by `app/(tabs)/resources.tsx` and `app/(tabs)/support.tsx` (hero, category tiles, drill-in detail, midnight support band).
- Prompt library: local, typed, HeartLink-authored prompt packs grouped by moment.
- Prompt detail view with the prompt text, a short "why this works" note, and a copy action.
- Letter-writing support content: mailroom do/don't, plan word limits (Basic 200, Diamond 300, VIP 350), tone guidance, pre-send checklist.
- An honest "Coming soon" band describing moderated supporter groups, with no signup that implies a ship date we have not committed to.

Out of scope for Phase 0: any posting, any member-to-member visibility, any write endpoint, any new backend.

**Demoable in:** a small number of focused sessions in this repo. See the implementation plan for the file-level breakdown.

### Phase 1 — Prompt to letter continuity

**Goal:** prompts stop being a reading experience and start being a writing experience.

- "Use this prompt" hands off into the existing compose flow with the prompt prefilled as a starting line or as a visible hint, respecting the existing rule that letter-writing is gated behind a liked/saved profile.
- Per-member state: saved prompts and used/unused marks. Requires either a small client-side store or a backend field, decided at that point.
- Prompt suggestions on the compose screen itself (a quiet "need a starting point?" affordance), not a takeover.

Backend dependency: none if state is client-local; a `saved_prompts` style endpoint if it must survive device changes. That call is deliberately deferred to Phase 1 rather than pre-built.

### Phase 2 — Curated supporter voices (read-only)

**Goal:** members see they are not alone, without opening a write surface.

- HeartLink-published stories and Q&A from real supporters, collected off-platform (email, interviews), edited and consent-cleared by the HeartLink team, published as static content.
- Reactions are optional and non-identifying at most. No comments.
- Reporting entry point already exists conceptually in Support ("report a concern"); extend it to cover published content.

Backend dependency: a simple content endpoint or continued local content, depending on how often the team wants to publish without a deploy.

### Phase 3 — Moderated supporter groups

**Goal:** the original forum idea, opened only when moderation capacity exists.

- Small, topic-scoped, invite-or-approve groups rather than an open board. Examples: first-time letter writers, long-distance and family, reentry support.
- Every member-authored post is pre-moderation by default (queued, reviewed, then published), not post-moderation. Post-moderation is what makes open forums unsafe for a population that includes vulnerable members and active scam targeting.
- Hard rules enforced in product, not just in policy: no direct contact exchange, no addresses, no money requests, no third-party arrangements, no facility-specific circumvention advice.
- Requires admin tooling before launch: moderation queue, ban/mute, audit trail, report triage SLA. That work lives in the HeartLink monorepo and admin surfaces, not in this repo.

**Gate:** Phase 3 does not start until there is a named human owner of the moderation queue and an agreed response SLA. This is a staffing gate, not an engineering gate.

---

## 3. Safety and moderation posture

The posture is safety-first and deliberately conservative, matching the locked verification copy already in `app/(tabs)/support.tsx`.

**Principles**

1. **Editorial before social.** Every phase ships HeartLink-authored content before it ships member-authored content. Risk is added only when there is capacity to absorb it.
2. **Pre-moderation, not post-moderation.** When member content eventually exists, nothing publishes unreviewed.
3. **No contact channel creation.** Support Circle must never become a way for two members to reach each other privately, and must never become a route around the letter pipeline and mailroom review.
4. **No claims we cannot back.** No "verified supporter," no "human-verified" phrasing, no safety guarantees. Verification language stays exactly as locked: profiles start as mailed paper applications reviewed before publishing, and the gold badge marks profiles that pass additional identity checks.
5. **Scam surface awareness.** Correspondence populations are actively targeted by money-request scams. Any group surface carries standing guidance and a one-tap report path.
6. **Privacy of the person inside.** Supporters must not be able to publish another person's identifying details, facility, case, or release information. This is a content rule enforced at moderation, and a field-level rule if structured posting ever exists.

**Content rules for prompts (Phase 0)**

- No prompts that solicit personal identifying information from either party.
- No prompts that encourage promises, financial commitments, or legal discussion.
- Prompts stay warm and specific without being romantic-pressure oriented. This is correspondence support, not dating copy.
- Anything touching mental health links out to Resources rather than advising.

**Reporting and escalation**

- Phase 0 and 1: reporting reuses the existing Support contact path. No new mechanism needed since there is no member content.
- Phase 2 onward: an explicit report action on every published item, routed to the same team that handles profile reports, with the 24-hour review expectation already stated in Support copy.

---

## 4. Demo narrative (client call)

Roughly four minutes, told from the member's point of view.

1. **The problem, in one line.** "Members tell us the hardest part is not finding someone. It is the blank page." Show the existing mailbox or compose entry as the moment of friction.
2. **Open Support Circle.** New nav item in the signed-in shell. Hero reads as private and supported, matching the rest of the app: midnight surface, gold line art, one pink glow.
3. **Browse by moment.** Tiles for the situations members actually write in: first letter, keeping it going, hard news, encouragement, holidays and dates that matter.
4. **Open one prompt.** Show prompt text plus the short "why this works" note. This is the moment the client sees the editorial quality bar, so pick the first-letter prompt.
5. **Letter-writing support.** Drill into the practical section: what a mailroom will reject, word limits by plan, the pre-send checklist. This lands the point that Support Circle protects deliverability, not just feelings.
6. **The honest future.** Show the moderated-groups band. Say plainly: this is where the forum idea goes, it opens when moderation capacity exists, and it opens pre-moderated and topic-scoped rather than as an open board.
7. **Ask.** Two decisions from the client: approve the editorial voice for prompts, and confirm whether they want to own moderation staffing for Phase 3 or defer it.

**Things not to say on the call**

- Do not describe Phase 0 as a forum or a community feed. It is a guided prompt library.
- Do not imply members can talk to each other in the demo build. They cannot.
- Do not commit a Phase 3 date. It is staffing-gated.

---

## 5. Relationship to open tasks

Notion was read in the session that produced this document. The table below maps Support Circle against the actual open HeartLink tasks in Notion as of 2026-08-10. Support Circle itself is not yet a Notion task; it is planning only, and no product code has been implemented for it.

| Open Notion task (status) | Relationship to Support Circle |
| --- | --- |
| HeartLink: build client-owned Gmail scan ingestion + Textract gating on Railway (Waiting, P1) | Unrelated pipeline work. Support Circle Phase 0 adds no backend and must not compete for this slot. |
| Build API-usage metrics layer + surface in admin dashboard (Waiting, P2) | Adjacent later. Phase 2 or 3 content and moderation endpoints would want the same metrics layer, so any Support Circle server-side move should reuse it rather than add its own instrumentation. |
| Develop the HeartLink native mobile app (Flutter, iOS + Android) (Waiting, P1) | Direct constraint on scope. Support Circle Phase 0 is built in this Expo web-first repo, so treat the content module (`src/lib/support-circle-content.ts`) as the portable artifact and the screen as throwaway if the Flutter app becomes the shipping surface. |
| Obtain PostGrid letter list and production activation (Waiting, P1; letter list mostly resolved/proposed, production activation blocked by a 403) | Upstream of the value story. Support Circle's letter-writing support content (mailroom do/don't, word limits, pre-send checklist) only pays off once letters actually mail in production. Do not demo Support Circle as fixing deliverability while activation is still blocked. |
| Secure client Stripe access and create plan products (Waiting, P1; test mode validated, live swap remains) | Feeds the plan word limits (Basic 200, Diamond 300, VIP 350) referenced in Phase 0 content. Confirm the final live plan names and limits before the prompt library hardcodes them. |
| Onboard test users on the consumer app and triage feedback (Waiting, P1) | Closest fit. Support Circle is the backlog-side answer to the "what do I write" class of feedback. Route that feedback here rather than into landing copy, and use the same onboarding cohort to validate the prompt voice. |

Repo-side context that is not a Notion task but still bears on this plan: the `zali-milestone-4` backend release enforces liked-before-letter server-side (Phase 1 compose handoff must respect it), the resource `state` field is precedent for moving Support Circle content server-side in Phase 2, and the standing tech debt (no tests, no ESLint, no CI) makes Phase 0 the cheapest place to introduce the first tests since it is pure content plus presentation with no network.

**Suggested new task entries** (to add to `docs/ai/tasks.md` and Notion once approved):

- [ ] Support Circle Phase 0 demo slice (consumer repo, local content, no API)
- [ ] Client approval: prompt editorial voice + moderated-groups band copy
- [ ] Decision needed: moderation ownership and SLA before any Phase 3 work is scheduled

---

## 6. Open questions for the client

1. Who owns the moderation queue when supporter groups open, and what response time do they commit to?
2. Should supporter stories in Phase 2 be attributed (first name, state) or fully anonymous?
3. Does the client want prompts to be editable by their team without a deploy, which would pull content server-side earlier than Phase 2?
4. Is there existing supporter-facing content (emails, FAQs, a Facebook group) whose voice the prompts should match?

---

## 7. Decisions to record

If Phase 0 is approved, log an ADR in `docs/ai/decisions.md` covering: Support Circle ships as an editorial prompt library before any social surface; member content is pre-moderated when it exists; and Support Circle never creates a member-to-member contact channel.
