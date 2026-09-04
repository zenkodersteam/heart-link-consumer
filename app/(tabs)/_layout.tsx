import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Slot, useGlobalSearchParams, usePathname } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar, MobileTopBar, Sidebar } from '../../src/components/AppNav';
import { OfflineBanner } from '../../src/components/ErrorState';
import { savePendingRoute } from '../../src/lib/pending-route';
import { PREVIEW_BYPASS_AUTH } from '../../src/lib/preview';
import { useIsOffline } from '../../src/lib/connectivity';
import { isOnboarded, useMyProfile } from '../../src/lib/use-my-profile';
import { colors, shell } from '../../src/theme';

const DESKTOP_BREAKPOINT = 900;

/**
 * Rebuilds the `?a=b` part of a route from the router's parsed params, so the
 * saved route carries the id a shared link pointed at. Read from the router
 * rather than `window.location` because there is no such thing on a phone.
 */
function queryString(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    // Repeated params arrive as an array; keep every value.
    for (const v of Array.isArray(value) ? value : [value]) search.append(key, v);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const { profile, loading: profileLoading, error: profileError } = useMyProfile();
  const offline = useIsOffline();

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Boot: Clerk hasn't resolved a session yet, so we don't know which shell to
  // draw. Paint the brand surface rather than `null` - returning null here left
  // a bare blush page with no top bar and no tab bar, which reads as a broken
  // screen on mobile where the boot window is longest.
  if (!isLoaded && !PREVIEW_BYPASS_AUTH) {
    return (
      <SafeAreaView style={[styles.mobileSafe, !isDesktop ? { height } : null]} edges={['top', 'bottom']}>
        <View style={styles.booting}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (!isSignedIn && !PREVIEW_BYPASS_AUTH) {
    // Remember where they were heading so the sign-in detour returns them to
    // it. Reaching this layout at all means the route was a real destination
    // inside the app, so everything except the home tab is worth keeping —
    // previously only sponsor invites were, and only on the web build, which
    // left a shared profile link on a phone landing on the home tab.
    if (pathname !== '/' && pathname !== '/(tabs)') {
      savePendingRoute(pathname + queryString(params));
    }
    return <Redirect href="/" />;
  }
  // Members introduce themselves before entering the app. If the profile can't
  // be loaded (API down), fail open so an outage never locks anyone out.
  //
  // While that check is in flight the member IS signed in, so draw the real
  // shell (rail or top bar + tabs) with a spinner in the content area. The
  // navigation never blinks out from under them.
  const profileGateLoading = isSignedIn && profileLoading;

  // Split-pane screens (Notion Mail pattern) fill the shell edge to edge;
  // everything else sits in the centered 1020px content column.
  const fullBleed = pathname.startsWith('/mailbox');

  if (!profileGateLoading && isSignedIn && !profileError && !isOnboarded(profile)) {
    return <Redirect href="/onboarding" />;
  }

  const content = profileGateLoading ? (
    <View style={styles.booting}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : (
    <Slot />
  );

  if (isDesktop) {
    // SafeAreaView (not a plain View) so the flex chain fills the viewport height
    // on web instead of collapsing to content height; footer pins to the bottom.
    return (
      <SafeAreaView style={styles.desktopShell} edges={['top']}>
        {offline ? <OfflineBanner /> : null}
        <View style={styles.desktopRow}>
          <Sidebar />
          <View style={styles.main}>
            <View style={[styles.mainColumn, fullBleed ? styles.mainColumnFull : null]}>
              {content}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.mobileSafe, { height }]} edges={['top', 'bottom']}>
      <MobileTopBar />
      {/* Between the bar and the content so it never covers either, and is
          equally visible on whichever screen the member is on. */}
      {offline ? <OfflineBanner /> : null}
      <View style={styles.content}>{content}</View>
      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopShell: { flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden' },
  desktopRow: { flex: 1, flexDirection: 'row', backgroundColor: colors.bgDeep, minHeight: 0 },
  main: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
    backgroundColor: colors.bgDeep,
    ...Platform.select({
      web: { backgroundImage: shell.mainGlowCss } as object,
    }),
  },
  mainColumn: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: shell.contentMaxWidth,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  mainColumnFull: { maxWidth: '100%' as never },
  mobileSafe: { flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden' },
  content: { flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden', minHeight: 0 },
  booting: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
});
