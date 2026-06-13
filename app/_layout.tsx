import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
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
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '../src/components/Toast';
import { tokenCache } from '../src/lib/token-cache';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BreeSerif_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!PUBLISHABLE_KEY) {
    throw new Error(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Add it to .env or the deploy env.',
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkLoaded>
          <View style={styles.root}>
            <StatusBar style="dark" />
            <ToastProvider>
              <Slot />
            </ToastProvider>
          </View>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
});
