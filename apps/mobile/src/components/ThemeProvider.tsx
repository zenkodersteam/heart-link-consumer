import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  getStoredThemePreference,
  storeThemePreference,
  themePreferenceReady,
  type ThemePreference,
} from '../lib/theme-preference';
import { getColorScheme, setColorScheme, type ColorScheme } from '../theme';

/**
 * Which theme is on, and who decided.
 *
 * The phone decides by default: someone who has told iOS or Android they want
 * dark has told this app too, and following that is the setting most people
 * never have to think about. Account offers the override for the rest - this
 * app is read in bed at one end of the day and on a bright bus at the other,
 * and the phone's own setting is not always right for both.
 *
 * `setColorScheme` runs during render rather than in an effect, deliberately.
 * Stylesheets read the active theme the moment they are touched, and children
 * render before an effect fires, so setting it afterwards would paint one frame
 * of the wrong theme on every launch.
 *
 * The `key` on the children is what makes a change take: stylesheets are module
 * state, so a component that does not re-render keeps last theme's object.
 * Remounting the tree costs a frame on a setting people change rarely, and it
 * guarantees nothing is left behind holding the wrong colours. `App` hands the
 * new navigator the old one's state, so a remount does not cost your place.
 */

interface ThemeValue {
  /** The theme actually on screen. */
  scheme: ColorScheme;
  /** What was asked for, which may be "follow the phone". */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue>({
  scheme: 'light',
  preference: 'system',
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `null` is "no preference" - the phone has not been told either way, which
  // is the light default rather than a reason to guess.
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredThemePreference);

  // The stored answer usually lands before the first render; when the keychain
  // is slow it arrives here instead, and the tree re-renders into it.
  useEffect(() => {
    let live = true;
    void themePreferenceReady.then((stored) => {
      if (live) setPreferenceState(stored);
    });
    return () => {
      live = false;
    };
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  if (getColorScheme() !== scheme) setColorScheme(scheme);

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      preference,
      setPreference: (next) => {
        storeThemePreference(next);
        setPreferenceState(next);
      },
    }),
    [preference, scheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeRoot key={scheme}>{children}</ThemeRoot>
    </ThemeContext.Provider>
  );
}

/** Its own component so the remount is the children's, not the provider's. */
function ThemeRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** The theme that is on, for the few places that need to branch on it. */
export function useTheme() {
  return useContext(ThemeContext);
}

/** True when the dark palette is active. */
export function useIsDark(): boolean {
  return useContext(ThemeContext).scheme === 'dark';
}
