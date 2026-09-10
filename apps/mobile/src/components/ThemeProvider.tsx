import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getColorScheme, setColorScheme, type ColorScheme } from '../theme';

/**
 * Which theme is on.
 *
 * The phone decides, and only the phone. Someone who has told iOS or Android
 * they want dark has told this app too, and that is the setting almost nobody
 * has to think about.
 *
 * There used to be an override in Account — always light, always dark, or
 * follow the phone. It was removed because of the one frame it could never
 * reach: iOS renders the launch screen from a static asset before any of our
 * code runs, so it can only pick by the phone's appearance. A member with the
 * app forced dark on a light phone launched into a cream splash and then a
 * dark app, every single time, and nothing on our side of the process start
 * could prevent it. A preference that is contradicted by the first second of
 * every launch is worse than no preference at all.
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
  /** The theme actually on screen, which is whatever the phone is set to. */
  scheme: ColorScheme;
}

const ThemeContext = createContext<ThemeValue>({ scheme: 'light' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `null` is "no preference" — the phone has not been told either way, which
  // is the light default rather than a reason to guess.
  const system = useColorScheme();
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light';

  if (getColorScheme() !== scheme) setColorScheme(scheme);

  const value = useMemo<ThemeValue>(() => ({ scheme }), [scheme]);

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
