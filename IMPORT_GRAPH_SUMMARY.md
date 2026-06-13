# IMPORT_GRAPH_SUMMARY

High-level dependency relationships in the consumer app.

---

## Core Dependency Nodes

Modules that many files depend on. Edits here ripple widely.

- `src/theme.ts` — imported by every UI file (every screen + every component). Pure constants; safe.
- `src/components/primitives.tsx` — Field, Button, Card, Pill used by AuthShell, FilterSheet, ProfileCard, account.tsx, profile.tsx, sign-in.tsx, sign-up.tsx
- `src/lib/api.ts` — types + `createApiClient`. Imported by `use-api-client.ts`, `use-public-profiles.ts`, `FilterSheet.tsx`, `ProfileCard.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx`
- `src/lib/use-api-client.ts` — bridges Clerk JWT into `createApiClient`. Imported by `use-public-profiles.ts`
- `@clerk/clerk-expo` (external) — used by `_layout.tsx` (provider), `index.tsx`, `(auth)/_layout.tsx`, `(tabs)/_layout.tsx`, `sign-in.tsx`, `sign-up.tsx`, `account.tsx`, `use-api-client.ts`
- `expo-router` (external) — used by every route file

---

## Layered Structure

```
app/                     (routes — depend on src/*)
  ├── _layout            → src/lib/token-cache, src/theme
  ├── index              → @clerk/clerk-expo only
  ├── (auth)/*           → src/components/AuthShell, primitives; src/theme
  └── (tabs)/*           → src/components/*, src/lib/*, src/theme

src/components/          (UI primitives + screen components)
  ├── AuthShell          → src/theme
  ├── primitives         → src/theme
  ├── ProfileCard        → src/lib/api (types), src/theme, primitives
  └── FilterSheet        → src/lib/api (types), src/theme, primitives

src/lib/                 (data + behaviors)
  ├── api                → (no internal deps; pure)
  ├── token-cache        → expo-secure-store, react-native (Platform)
  ├── use-api-client     → @clerk/clerk-expo, src/lib/api
  ├── use-public-profiles → src/lib/api, src/lib/use-api-client
  └── use-keyboard-grid-nav → react-native (Platform) only

src/theme.ts             (leaf — no deps)
```

Direction is strictly downward. No cycles.

---

## Circular Dependencies

None detected. Single-direction graph: `app/` → `src/components/` + `src/lib/` → `src/theme.ts`.

---

## Highly Coupled Modules

- `app/(tabs)/index.tsx` (browse screen) — pulls in `FilterSheet`, `ProfileCard`, `primitives`, `use-public-profiles`, `use-keyboard-grid-nav`, `api` types, `theme`. Justified by its responsibility as the main feature surface.
- `app/_layout.tsx` — bootstrap entry; high external-package fan-in (Clerk, fonts, splash, gesture handler, status bar). Concentrated by design.

---

## Potential Refactor Risk Areas

- `src/lib/api.ts` (medium risk) — inlined types from the main HeartLink monorepo's `@heartlink/api-contract`. Manual re-sync when admin API changes. If the contract drifts, type errors surface in `use-public-profiles.ts`, `ProfileCard.tsx`, `FilterSheet.tsx`, `app/(tabs)/*`. Mitigation: keep all type changes in `api.ts`; never inline types directly in components.
- `src/theme.ts` (low risk, high reach) — every UI file imports tokens. Renaming a token requires a multi-file edit. Mitigation: additive changes (new tokens) are free; renames need a sweep.
- `@clerk/clerk-expo` upgrades (low-medium risk) — touches `_layout.tsx`, route guards, both auth screens, and `use-api-client.ts`. Major Clerk SDK bumps require coordinated edits.

---

## External Dependency Concentration

- Clerk SDK: 8 files reference it
- Expo Router: 9 files reference it
- React Native primitives (View, Text, StyleSheet, Pressable, etc.): every UI file
- `expo-image`: ProfileCard, profile.tsx (image rendering only)
- `react-native-reanimated`: only via babel plugin; not directly imported anywhere yet (reserved for future swipe/gesture work)
