import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
 * Storage differs per platform, so reads are async: on a cold start the value
 * is on disk and has not been read back yet. `takePendingRoute()` is the one
 * to call, and it clears as it reads — a remembered route is used once.
 */

const KEY = 'heartlink.pendingRoute';

/** Mirrors the stored value so a save is visible immediately. */
let memory: string | null = null;

const isWeb = Platform.OS === 'web';

/**
 * Started at import so the value is usually already in hand by the time
 * anything asks. Native only; on web `localStorage` is synchronous.
 */
const hydrated: Promise<void> = isWeb
  ? Promise.resolve()
  : SecureStore.getItemAsync(KEY)
      .then((v) => {
        // A route saved during this session is newer than whatever was on disk.
        if (v && memory === null) memory = v;
      })
      .catch(() => {
        // Keychain unavailable. The in-memory copy still covers the common case
        // where the app is not killed mid sign-in.
      });

export function savePendingRoute(path: string): void {
  memory = path;
  if (isWeb) {
    try {
      window.localStorage?.setItem(KEY, path);
    } catch {
      // Private mode. Memory covers the session.
    }
    return;
  }
  void SecureStore.setItemAsync(KEY, path).catch(() => {});
}

/** Reads the remembered route and forgets it. Returns null when there is none. */
export async function takePendingRoute(): Promise<string | null> {
  if (isWeb) {
    let value = memory;
    try {
      value = window.localStorage?.getItem(KEY) ?? value;
      window.localStorage?.removeItem(KEY);
    } catch {
      // ignore
    }
    memory = null;
    return value;
  }

  await hydrated;
  const value = memory;
  memory = null;
  void SecureStore.deleteItemAsync(KEY).catch(() => {});
  return value;
}
