import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, useColorScheme } from 'react-native';

import { colors as lightPalette, darkColors } from '@heartlink/design-tokens';

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

  // Whether the theme has changed since launch. Worked out during render, not
  // in an effect, so the veil is part of the very frame the remount happens
  // in — an effect would let one bare frame of the half-built tree through.
  // Launch itself is covered by the splash, so only a later change gets a veil.
  const [launchScheme] = useState(scheme);
  const [hasChanged, setHasChanged] = useState(false);
  if (!hasChanged && scheme !== launchScheme) setHasChanged(true);

  return (
    <ThemeContext.Provider value={value}>
      <View style={styles.fill}>
        <ThemeRoot key={scheme}>{children}</ThemeRoot>
        {hasChanged ? (
          <ThemeVeil key={scheme} color={(scheme === 'dark' ? darkColors : lightPalette).bgDeep} />
        ) : null}
      </View>
    </ThemeContext.Provider>
  );
}

/**
 * Covers the remount a theme change causes, then fades away.
 *
 * Remounting is what makes a change take (see above), and it is not free:
 * every screen rebuilds, refetches and reloads its photos. Uncovered, that
 * read as the app flickering — skeletons, blanks and images popping in, all at
 * once. This lays the new theme's ground over it for the moment that takes,
 * then dissolves into the rebuilt app, so a theme change looks like one fade
 * rather than a stutter.
 *
 * Keyed on the scheme, so each change mounts a fresh veil at full opacity.
 */
function ThemeVeil({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [done, setDone] = useState(false);

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: 320,
      // Long enough for the rebuilt tree to paint its first frame underneath.
      delay: 160,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setDone(true);
    });
    return () => animation.stop();
  }, [opacity]);

  if (done) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

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
