import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { useIsDark } from './ThemeProvider';
import { colors, darkColors } from '@heartlink/design-tokens';

const ARTWORK = require('../../assets/heartlink-splash.png');
const ARTWORK_DARK = require('../../assets/heartlink-splash-dark.png');

/**
 * Pulls the artwork into the cache before the overlay is shown. Without it the
 * first frame over a dev server is an empty cream screen while Metro serves the
 * image.
 */
export function preloadBrandSplash() {
  return Promise.all([
    Asset.fromModule(ARTWORK).downloadAsync(),
    Asset.fromModule(ARTWORK_DARK).downloadAsync(),
  ]);
}

/**
 * Long enough to register as a brand moment, short enough not to be a wait.
 *
 * Android holds longer because this is the only place the artwork is ever seen
 * there; on iOS the launch storyboard has already been showing it for the whole
 * of the launch, so this is just the tail of it.
 */
const HOLD_MS = Platform.OS === 'android' ? 700 : 300;
const FADE_MS = 320;

/**
 * The splash belongs to the launch, and a launch happens once.
 *
 * Module scope on purpose. Changing theme remounts the entire tree — that is
 * how stylesheets pick up the new palette — and a remounted splash has no
 * memory of having already played, so switching to dark replayed the whole
 * launch animation over an app that was running perfectly well. This outlives
 * the remount, which is the only place the fact can be kept.
 */
let alreadyShown = false;

/**
 * The launch artwork, drawn by the app rather than the platform.
 *
 * Android is the reason this exists. Since Android 12 the splash belongs to the
 * OS: one centred icon on one flat colour, masked to a circle, and no way to
 * put a full screen image there. So the artwork is painted here instead, over
 * the app, while the native splash is still up - and released once the fonts
 * and the image itself are ready.
 *
 * On iOS it is laid out to match the launch storyboard exactly (fitted, on the
 * same ground) so the swap from storyboard to app is invisible; what you see is
 * one continuous splash that happens to change owner halfway through.
 *
 * Each theme has its own artwork. The light illustration is cream and
 * full-bleed — the brightest thing the app owns — so at night it read as a
 * white flash before a dark app; the dark one is the same composition drawn on
 * the dark ground.
 *
 * Which one is shown follows the phone, which is now the only thing the app's
 * theme follows either — so this always matches both the launch storyboard
 * underneath it and the app about to appear above it. That agreement is the
 * reason the in-app theme override was removed: iOS picks the storyboard from
 * a static asset before our code runs, so an app forced dark on a light phone
 * could only ever launch cream and then turn dark.
 */
export function BrandSplash({ release }: { release: boolean }) {
  const dark = useIsDark();
  const opacity = useRef(new Animated.Value(1)).current;
  // Read once, at mount: a splash that is already up must finish its fade
  // rather than vanish the instant the flag is set.
  const [mounted, setMounted] = useState(() => !alreadyShown);

  useEffect(() => {
    if (!release) return undefined;

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Unmount only on a real finish: an interrupted animation leaves the
        // overlay part-faded, and dropping it then would flash the app in.
        if (finished) {
          alreadyShown = true;
          setMounted(false);
        }
      });
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, [release, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      // The ground is the band above and below a fitted image, so it has to be
      // the colour the storyboard just used.
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: (dark ? darkColors : colors).bgDeep, opacity },
      ]}
    >
      {/* `transition={0}`: the fade out is the only one wanted. */}
      <Image
        source={dark ? ARTWORK_DARK : ARTWORK}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={0}
      />
    </Animated.View>
  );
}
