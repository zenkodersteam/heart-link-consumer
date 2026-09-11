import { BreeSerif_400Regular } from '@expo-google-fonts/bree-serif';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  type NavigationState,
  type Theme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandSplash, preloadBrandSplash } from './src/components/BrandSplash';
import { ThemeProvider, useTheme } from './src/components/ThemeProvider';
import { ToastProvider } from './src/components/Toast';
import { SessionProvider } from './src/lib/session';
import {
  configureNotificationHandler,
  usePushRegistration,
} from './src/lib/use-push-registration';
import { navigationRef } from './src/navigations/navigationRef';
import { RootStack } from './src/navigations/RootStack';
import { colors, themedStyles } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Where you were, kept across a theme change.
 *
 * Switching theme remounts the tree - stylesheets are module state, so a
 * component that does not re-render would otherwise keep the old palette - and
 * a remounted navigator starts at its first screen. Someone reading a letter at
 * dusk, when the phone switches itself to dark, would be thrown back to Home.
 *
 * Module scope, not a ref: everything inside the provider is what remounts, so
 * a ref in there is thrown away at exactly the moment it is needed.
 */
let lastNavigationState: NavigationState | undefined;

/**
 * The saved state, minus the navigation instructions it has already carried out.
 *
 * `navigate('Tabs', { screen: 'Mailbox', params: { compose } })` leaves that
 * `{ screen, params }` on the Tabs route for good. A navigator knows it has
 * acted on it only through a record its container keeps — and the remount
 * throws that container away, so the new one found the instruction and carried
 * it out again. That is how changing theme reopened a letter the member had
 * already closed. The state beside it already says where they are; the
 * instruction is spent, and is dropped wherever the navigator it was meant for
 * has a state of its own to restore.
 */
function withoutSpentInstructions(state: NavigationState): NavigationState {
  return {
    ...state,
    routes: state.routes.map((route) => {
      const nested = (route as { state?: NavigationState }).state;
      if (!nested) return route;
      const params = route.params as Record<string, unknown> | undefined;
      const kept =
        params && typeof params.screen === 'string'
          ? Object.fromEntries(
              Object.entries(params).filter(
                ([key]) => !['screen', 'params', 'initial', 'path', 'merge', 'pop', 'state'].includes(key),
              ),
            )
          : params;
      return { ...route, params: kept, state: withoutSpentInstructions(nested) };
    }),
  } as NavigationState;
}

/** Launch artwork is fetched once per process, not once per theme. */
let artworkReady = false;


/**
 * Registers this device for notifications once someone is signed in, and sends
 * a tapped notification to the screen it was about. Renders nothing.
 */
function PushRegistration() {
  usePushRegistration();
  return null;
}

configureNotificationHandler();

/**
 * The navigator's own theme, so the surface behind a push is ours.
 *
 * React Navigation paints its container background during a transition; left
 * at its default white, every screen change flashed white against the app's
 * warm ground - and at night it would flash white against a dark one, which is
 * worse. Built per theme for the same reason as everything else here.
 */
function navigationTheme(dark: boolean): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bgDeep,
      card: colors.bgElevated,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };
}

export default function App() {
  return (
    // Outermost, above everything that reads a colour: the theme has to be
    // decided before the first stylesheet is touched.
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { scheme } = useTheme();

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
  //
  // Seeded from module scope, because a theme change remounts this component:
  // starting again at `false` made a running app go "not ready" for a beat and
  // re-run a download that had already finished.
  const [artworkLoaded, setArtworkLoaded] = useState(artworkReady);
  useEffect(() => {
    if (artworkReady) return undefined;
    let live = true;
    preloadBrandSplash()
      .catch(() => undefined)
      .finally(() => {
        artworkReady = true;
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
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);


  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* The session wraps the navigator, not the other way round: which
            stack exists at all is decided from it. */}
        <SessionProvider>
          <View style={styles.root}>
            {/* The clock and the battery, in whichever theme is on. */}
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
            {fontsLoaded ? (
              <NavigationContainer
                ref={navigationRef}
                theme={navigationTheme(scheme === 'dark')}
                initialState={lastNavigationState}
                onStateChange={(state) => {
                  lastNavigationState = state ? withoutSpentInstructions(state) : state;
                }}
              >
                <RootStack />
              </NavigationContainer>
            ) : null}
          </ToastProvider>
          {/* Last child, so it covers the app rather than sitting under it. */}
          <BrandSplash release={ready} />
          </View>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = themedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.bgDeep },
}));
