import * as SecureStore from 'expo-secure-store';

/**
 * Which theme the member has asked for, remembered between launches.
 *
 * `system` is the default and the recommended setting - someone who has told
 * their phone they want dark has told this app too. The two explicit values
 * exist because a preference the app cannot be told is a preference the app
 * gets wrong for the people whose phone setting does not match how they use
 * this particular app: read in bed on a bright phone, or the other way round.
 *
 * Stored in SecureStore because it is the store this app already has. It holds
 * no secret; the alternative was a whole new dependency for one string.
 */

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'heartlink.theme-preference';

function parse(raw: string | null): ThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

/**
 * Read at import so the answer is usually in hand before the first render.
 *
 * A launch that beats the read shows the system theme for a frame and then
 * settles - which is the same thing that happens on a phone whose owner has
 * never touched this setting, and is why `system` is the fallback rather than
 * an arbitrary one of the two.
 */
let memory: ThemePreference = 'system';

export const themePreferenceReady: Promise<ThemePreference> = SecureStore.getItemAsync(KEY)
  .then((raw) => {
    memory = parse(raw);
    return memory;
  })
  .catch(() => memory);

export function getStoredThemePreference(): ThemePreference {
  return memory;
}

export function storeThemePreference(preference: ThemePreference): void {
  memory = preference;
  void SecureStore.setItemAsync(KEY, preference).catch(() => {});
}
