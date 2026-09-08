import { BreeSerif_400Regular } from '@expo-google-fonts/bree-serif';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BrandSplash, preloadBrandSplash } from '../src/components/BrandSplash';
import { ToastProvider } from '../src/components/Toast';
import { SessionProvider } from '../src/lib/session';
import {
  configureNotificationHandler,
  usePushRegistration,
} from '../src/lib/use-push-registration';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Locked UI-lift rule: no visible scrollbars on any scroll surface (web).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent =
    '* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; width: 0; height: 0; }';
  document.head.appendChild(style);
}


/**
 * Registers this device for notifications once someone is signed in, and sends
 * a tapped notification to the screen it was about. Renders nothing.
 */
function PushRegistration() {
  usePushRegistration();
  return null;
}

configureNotificationHandler();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BreeSerif_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // The in-app splash cannot cover the swap until it has the artwork, so the
  // native one is held for that as well as for the fonts. A failed fetch still
  // releases: a plain cream screen beats a launch that never finishes.
  const [artworkLoaded, setArtworkLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    preloadBrandSplash()
      .catch(() => undefined)
      .finally(() => {
        if (live) setArtworkLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  // Web has no native splash, so release it on the first frame; native waits so
  // the branded splash covers the swap.
  const ready = fontsLoaded && artworkLoaded;
  useEffect(() => {
    if (ready || Platform.OS === 'web') SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);


  return (
    <GestureHandlerRootView style={styles.root}>
      {/* No gate on the session here: the public marketing page at `/` must
          paint before the stored token has been checked. Every authed layout
          ((tabs), (auth), (onboarding)) waits on its own `isLoaded`. */}
      <SessionProvider>
        <View style={styles.root}>
          <StatusBar style="dark" />
          <ToastProvider>
            {/* Inside SessionProvider: registration waits until somebody is
                signed in, so the permission prompt arrives when there is
                something to be notified about rather than on first launch. */}
            <PushRegistration />
            {/* Nothing is drawn until the fonts are in.
                Android measures a Text once, with whatever typeface is loaded
                at that moment, and does not re-measure when the real font
                arrives - so a tree laid out against the fallback keeps those
                widths and renders Inter and Bree Serif inside them. That is
                what was clipping the wordmark to "HeartLin" and ellipsising
                buttons mid-word. iOS re-measures, which is why it only showed
                on Android. The splash is up for this whole time anyway. */}
            {fontsLoaded ? <Slot /> : null}
          </ToastProvider>
          {/* Last child, so it covers the app rather than sitting under it. */}
          <BrandSplash release={ready} />
        </View>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
});
