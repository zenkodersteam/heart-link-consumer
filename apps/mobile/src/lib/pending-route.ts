import * as SecureStore from 'expo-secure-store';

import type { RootStackParamList } from '../navigations/types';

/**
 * Remembers where someone was heading when they were bounced to sign-in, so a
 * shared or emailed link (a sponsor invite, a profile someone sent a friend)
 * lands on the intended screen instead of the home tab.
 *
 * Two things this has to survive:
 *
 *  - The sign-up detour, which on a phone often means leaving the app entirely
 *    to fetch an emailed code. The app can be killed while that happens, so an
 *    in-memory note is not enough and the route is written to disk.
 *  - Onboarding, which sits between signing in and reaching the app.
 *
 * Reads are async: on a cold start the value is on disk and has not been read
 * back yet. `takePendingRoute()` is the one to call, and it clears as it reads
 * — a remembered route is used once.
 *
 * A screen name and its params, not a URL. The app navigates by name now, and
 * a stored path would have to be parsed back into one — a second, weaker copy
 * of the routing table, kept in sync by hand.
 */

const KEY = 'heartlink.pendingRoute';

export interface PendingRoute {
  name: keyof RootStackParamList;
  params?: Record<string, unknown>;
}

/** Mirrors the stored value so a save is visible immediately. */
let memory: PendingRoute | null = null;

function parse(raw: string | null): PendingRoute | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PendingRoute;
    return value?.name ? value : null;
  } catch {
    // Written by an older build, when this held a path. Nothing to route to.
    return null;
  }
}

/**
 * Started at import so the value is usually already in hand by the time
 * anything asks. Native only; on web `localStorage` is synchronous.
 */
const hydrated: Promise<void> = SecureStore.getItemAsync(KEY)
  .then((raw) => {
    // A route saved during this session is newer than whatever was on disk.
    if (memory === null) memory = parse(raw);
  })
  .catch(() => {
    // Keychain unavailable. The in-memory copy still covers the common case
    // where the app is not killed mid sign-in.
  });

export function savePendingRoute(route: PendingRoute): void {
  memory = route;
  void SecureStore.setItemAsync(KEY, JSON.stringify(route)).catch(() => {});
}

/** Reads the remembered route and forgets it. Returns null when there is none. */
export async function takePendingRoute(): Promise<PendingRoute | null> {
  await hydrated;
  const value = memory;
  memory = null;
  void SecureStore.deleteItemAsync(KEY).catch(() => {});
  return value;
}
