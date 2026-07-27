import { ClerkProvider } from '@clerk/clerk-expo';
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
import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '../src/components/Toast';
import { tokenCache } from '../src/lib/token-cache';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Locked UI-lift rule: no visible scrollbars on any scroll surface (web).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent =
    '* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; width: 0; height: 0; }';
  document.head.appendChild(style);
}

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BreeSerif_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Web has no native splash, so release it on the first frame; native waits for
  // the fonts so the branded splash covers the swap.
  useEffect(() => {
    if (fontsLoaded || Platform.OS === 'web') SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!PUBLISHABLE_KEY) {
    throw new Error(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Add it to .env or the deploy env.',
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* No ClerkLoaded gate here: the public marketing page at `/` must paint
          before Clerk finishes booting. Every authed layout ((tabs), (auth),
          (onboarding)) already waits on its own `useAuth().isLoaded`. */}
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <View style={styles.root}>
          <StatusBar style="dark" />
          <ToastProvider>
            <Slot />
          </ToastProvider>
        </View>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
});
