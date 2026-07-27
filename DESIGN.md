---
version: "1.0"
name: HeartLink
description: Soft-premium connection platform UI with warm blush surfaces, deep-purple chrome, hot-pink primary actions, metallic-gold trust accents, and swipe-first interactions.
client: HeartLink
last-updated: 2026-07-15
colors:
  primary: "#E91E73"
  primary-hover: "#C81860"
  secondary: "#2E1240"
  secondary-alt: "#2E1A47"
  accent: "#C9912E"
  accent-alt: "#C9A24B"
  neutral-light: "#FBF1EB"
  neutral-light-alt: "#FBF1EC"
  surface: "#FFFFFF"
  surface-muted: "#F3E7E0"
  text-primary: "#2E1240"
  text-secondary: "#6E5C80"
  text-muted: "#9C8CAE"
  border: "rgba(46, 18, 64, 0.10)"
  overlay: "rgba(26, 8, 51, 0.45)"
typography:
  display:
    fontFamily: "Bree Serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.15
  h1:
    fontFamily: "Bree Serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.2
  h2:
    fontFamily: "Bree Serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.25
  body-large:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
  button:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.2
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
rounded:
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  pill: "999px"
shadow:
  card: "0 8px 24px rgba(46, 26, 71, 0.10)"
  soft: "0 4px 12px rgba(46, 26, 71, 0.06)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    minHeight: "54px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.md}"
    minHeight: "54px"
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  nav-rail:
    backgroundColor: "{colors.secondary}"
    textColor: "#FBF5E8"
    rounded: "{rounded.lg}"
  profile-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    shadow: "{shadow.card}"
  badge-verified:
    icon: "shield-check"
    accentColor: "{colors.accent}"
    rounded: "{rounded.pill}"
  action-like:
    backgroundColor: "{colors.surface}"
    iconColor: "{colors.primary}"
    rounded: "{rounded.pill}"
  action-second-look:
    backgroundColor: "{colors.surface}"
    iconColor: "{colors.accent}"
    rounded: "{rounded.pill}"
  action-pass:
    backgroundColor: "{colors.surface}"
    iconColor: "{colors.secondary}"
    rounded: "{rounded.pill}"
---

*Authored by implementation team*

## Overview
HeartLink should feel warm, premium, safe, and emotionally reassuring. It is not a playful connection platform and it is not generic SaaS. The product promise is intimate connection with a polished, trustworthy surface that can scale to millions of users without losing softness or clarity. Swipe discovery is the center of gravity, and every surrounding UI choice should support that core rhythm.

## Voice
HeartLink should sound calm, encouraging, credible, and hopeful. It should never sound gimmicky, flirty, or hype-driven.

In voice:
- Love knows no bounds.
- Connect with confidence through a private, supportive experience.
- Discover meaningful profiles in a calm, trusted environment.

Out of voice:
- Start swiping now and meet hot matches fast.
- Unlock crazy premium perks today.

## Colors
- **Primary pink** is for the highest-emphasis actions and positive save or like states. It should feel warm, romantic, and intentional.
- **Deep purple** is structural chrome. Use it for navigation, anchor elements, major headings, and strong contrast moments.
- **Metallic gold** is for trust, verification, premium cues, dividers, and small moments of polish. Use it sparingly so it keeps its value.
- **Cream and blush neutrals** should dominate page backgrounds. The product should feel light and breathable, not dark and neon.
- **White surfaces** should carry cards, sheets, and elevated content blocks.

## Typography
- Use **Bree Serif** for display moments, the HeartLink wordmark, emotional hero copy, and key screen headings.
- Use **Inter** for controls, metadata, navigation, labels, forms, helper text, and body copy.
- The serif and sans pairing is part of the brand. Do not collapse the interface into all-sans headings.
- Keep line heights generous enough to feel calm and premium.

## Layout
- Desktop should use generous whitespace, centered primary content, and simple navigation structures.
- The canonical desktop Home pattern is a deep-purple nav rail with a centered swipe deck and lightweight filter chips above or near the deck.
- Mobile should be a stacked single-column flow with bottom navigation and thumb-friendly action placement.
- Filters should refine discovery without overpowering the swipe card.
- Value-prop and reassurance blocks should close pages consistently instead of inventing a new footer treatment per screen.

## Components
### Profile card
- This is the flagship component.
- Large photo on top, white information slab below.
- Soft rounding, subtle floating shadow, and visible deck depth are required.
- Use a top-right heart for save state.
- Verified state uses a **gold shield-check** treatment, not blue.
- Metadata rows should be concise and scannable.
- The quote or bio should sit below the structured facts.

### Swipe actions
- **Like** uses pink.
- **Second Look** uses gold.
- **Pass** uses deep purple.
- Actions should feel springy, polished, and lightly floating, not flat or arcade-like.

### Filters
- Keep the desktop Home swipe-first. Do not use the rejected persistent left filter rail as the canonical desktop layout.
- Single-select gender commits instantly.
- Age uses a hybrid of presets plus editable min and max range.
- The unset filter chip label can remain `All` for consistency, while the actual menu option should read `Everyone`.

### Navigation
- Mobile bottom nav is: Home, Mailbox, Liked, Resources, Support.
- Desktop navigation should come from one canonical source so labels do not drift.
- Use `Liked` as the canonical navigation label, not `Liked Profiles`.

### Auth
- Canonical auth framing is a branded marketing splash leading into separate email and password forms.
- Lead with reassurance before asking for account creation.
- Do not imply unsupported social login options.

### Footer and reassurance blocks
- Prefer a shared value-prop system rather than custom footer variants per screen.
- Messaging should reinforce safety, trust, privacy, and emotional support.

## Do-Not-Use
- Do not use neon or blue social-app accents for verification.
- Do not replace the gold verified cue with teal or generic platform blue.
- Do not flatten the profile card into generic SaaS rectangles with hard corners.
- Do not let filter controls dominate the Home screen more than the swipe deck.
- Do not use a persistent left filter rail as the default desktop Home layout.
- Do not use full facility names where the product rule is state-only.
- Do not swap Bree Serif hero moments for a modern sans heading system.
- Do not introduce loud gamification language, dating slang, or growth-hack copy.
- Do not treat every raw client mock inconsistency as canon.

## Client Context
HeartLink serves a sensitive emotional use case where trust, dignity, and clarity matter as much as conversion. The interface needs to feel premium enough for mass adoption, but also safe and mature enough to avoid feeling exploitative or frivolous. At million-user scale, consistency matters more than literal mock replication. The winning system is the one that preserves the swipe-first experience, protects brand trust, and stays coherent across web and native.

## Handoff Notes
This design system turns the client scan deck into one premium, scalable product language. It preserves the strongest parts of the mockups, resolves the conflicting pieces, and gives both web and native teams one shared source of truth for how HeartLink should look and feel. The result should be soft, premium, swipe-first, and consistent enough to support millions of users without drifting into generic connection-platform or generic SaaS aesthetics.
