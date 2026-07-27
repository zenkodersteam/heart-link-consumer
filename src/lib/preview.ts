/**
 * PREVIEW MODE
 * ------------
 * While the team is reviewing the design, auth is bypassed so every screen is
 * reachable without signing in, and the Home deck falls back to sample profiles
 * when the (token-less) API returns nothing.
 *
 * ⚠️  FLIP `PREVIEW_BYPASS_AUTH` TO `false` (or delete this flag's usages) BEFORE
 *     ANY PRODUCTION DEPLOY. While true, anyone can reach the signed-in app and
 *     the Home screen shows placeholder people.
 */

import type { PublicProfileDetail, PublicProfileSummary } from './api';

// Opt-in via env for local design review (renders every screen + sample data
// without a Clerk session). Defaults to false so a production build can never
// ship with the bypass on by accident.
export const PREVIEW_BYPASS_AUTH = process.env.EXPO_PUBLIC_PREVIEW_BYPASS_AUTH === 'true';

export const PREVIEW_PROFILES: PublicProfileSummary[] = [
  {
    id: 'preview-1',
    displayName: 'Marcus T.',
    age: 32,
    bioExcerpt: 'Into fitness, reading, and a good laugh',
    facility: { id: 'pf1', state: 'CA' },
    planTier: null,
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    photoCount: 3,
    activatedAt: '2026-01-01',
  },
  {
    id: 'preview-2',
    displayName: 'Andre P.',
    age: 29,
    bioExcerpt: 'Music, cooking, and deep conversations',
    facility: { id: 'pf2', state: 'TX' },
    planTier: null,
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
    photoCount: 2,
    activatedAt: '2026-01-01',
  },
  {
    id: 'preview-3',
    displayName: 'Devon R.',
    age: 35,
    bioExcerpt: 'Faith, family, and second chances',
    facility: { id: 'pf3', state: 'IL' },
    planTier: null,
    primaryPhotoUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=600&q=80',
    photoCount: 4,
    activatedAt: '2026-01-01',
  },
];

const PREVIEW_EXTRA: Record<string, { bio: string; releaseDate: string; seeking: string; interests: string }> = {
  'preview-1': { bio: 'Into fitness, reading, and a good laugh.', releaseDate: '2026-06-01', seeking: 'Looking for someone real to grow alongside.', interests: 'Fitness, Reading, Personal Growth' },
  'preview-2': { bio: 'Music, cooking, and deep conversations.', releaseDate: '2026-09-15', seeking: 'Hoping to build a genuine, lasting connection.', interests: 'Music, Cooking, Nature' },
  'preview-3': { bio: 'Faith, family, and second chances.', releaseDate: '2027-02-01', seeking: 'Seeking honesty, patience, and a fresh start.', interests: 'Faith, Family, Volunteering' },
};

// Full detail for the front-card fetch while previewing (no token to hit the API).
export const PREVIEW_DETAILS: Record<string, PublicProfileDetail> = Object.fromEntries(
  PREVIEW_PROFILES.map((p) => [
    p.id,
    {
      ...p,
      bio: PREVIEW_EXTRA[p.id]?.bio ?? null,
      releaseDate: PREVIEW_EXTRA[p.id]?.releaseDate ?? null,
      locationDescription: null,
      matchPreferences: { seeking: PREVIEW_EXTRA[p.id]?.seeking ?? null, interests: PREVIEW_EXTRA[p.id]?.interests ?? null },
      photos: [],
      acceptsMail: true,
      interests: (PREVIEW_EXTRA[p.id]?.interests ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
  ]),
);
