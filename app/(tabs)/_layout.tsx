import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Slot } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar, MobileTopBar, Sidebar } from '../../src/components/AppNav';
import { colors } from '../../src/theme';

const DESKTOP_BREAKPOINT = 900;

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { width } = useWindowDimensions();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/welcome" />;

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  if (isDesktop) {
    return (
      <View style={styles.desktopRow}>
        <Sidebar />
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileSafe} edges={['top', 'bottom']}>
      <MobileTopBar />
      <View style={styles.content}>
        <Slot />
      </View>
      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopRow: { flex: 1, flexDirection: 'row', backgroundColor: colors.bgDeep },
  mobileSafe: { flex: 1, backgroundColor: colors.bgDeep },
  content: { flex: 1, backgroundColor: colors.bgDeep },
});
