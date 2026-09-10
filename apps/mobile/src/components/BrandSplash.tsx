import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { colors, themedStyles } from '../theme';

const ARTWORK = require('../../assets/heartlink-splash.png');

/**
 * Pulls the artwork into the cache before the overlay is shown. Without it the
 * first frame over a dev server is an empty cream screen while Metro serves the
 * image.
 */
export function preloadBrandSplash() {
  return Asset.fromModule(ARTWORK).downloadAsync();
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
 */
export function BrandSplash({ release }: { release: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);

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
        if (finished) setMounted(false);
      });
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, [release, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.ground, { opacity }]}
    >
      {/* `transition={0}`: the fade below is the only one wanted. */}
      <Image
        source={ARTWORK}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={0}
      />
    </Animated.View>
  );
}

const styles = themedStyles((colors) => ({
  // The artwork's own ground, the splash background and the first screen are
  // all this colour, so the fit leaves no visible band.
  ground: { backgroundColor: colors.bgDeep },
}));
