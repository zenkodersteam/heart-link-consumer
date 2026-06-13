# HeartLink Consumer App

Public-facing consumer surface for HeartLink. Expo Web (with iOS/Android post-MVP).

## Stack

- Expo SDK 52 + Expo Router 4
- Clerk for auth (shared with admin)
- React Native Web
- Bree Serif + Inter via @expo-google-fonts

## Setup

```powershell
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY + EXPO_PUBLIC_API_BASE_URL
npm run web
```

## Build for production

```powershell
npm run build:web      # produces dist/
```

## Deploy (Vercel)

```powershell
vercel --prod
```

Vercel handles the build via `vercel.json` (runs `expo export --platform web`). Set the two `EXPO_PUBLIC_*` env vars in the Vercel dashboard.

## Notes

- API types are inlined in `src/lib/api.ts` from the main HeartLink monorepo's `@heartlink/api-contract` + `@heartlink/api-client`. Re-sync by hand when the admin API contract changes.
- Web-first for MVP. Native iOS/Android via EAS Build is post-MVP.
