import { useSession } from '../../src/lib/session';
import { Redirect, Slot, useGlobalSearchParams, usePathname } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar, MobileTopBar, Sidebar } from '../../src/components/AppNav';
import { OfflineBanner } from '../../src/components/ErrorState';
import { useKeyboard } from '../../src/lib/use-keyboard';
import { savePendingRoute } from '../../src/lib/pending-route';
import { PREVIEW_BYPASS_AUTH } from '../../src/lib/preview';
import { useIsOffline } from '@heartlink/consumer-api';
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
  const { isSignedIn, isLoaded } = useSession();
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const { profile, loading: profileLoading, error: profileError } = useMyProfile();
  const offline = useIsOffline();
  const keyboard = useKeyboard();

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Boot: the stored session has not resolved yet, so we don't know which shell to
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
    // The splash, not "/" — that route is the home tab itself now that the
    // marketing page is gone, so sending them there bounced straight back here.
    return <Redirect href="/(auth)/welcome" />;
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

  // Nothing of the shell until the answer is in.
  //
  // The rail, the top bar and the tab bar used to draw around a spinner while
  // the profile was still loading, so someone arriving from the sign-up code
  // watched the whole app appear and then vanish as the redirect landed on
  // onboarding, which has no shell. Holding it all is one transition instead of
  // two — and the navigation is precisely what should not be on screen for
  // someone who is about to be sent away from it.
  if (profileGateLoading) {
    return (
      <SafeAreaView
        style={[styles.mobileSafe, !isDesktop ? { height } : null]}
        edges={['top', 'bottom']}
      >
        <View style={styles.booting}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const content = <Slot />;

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
    // Only the top edge is inset here. The tab bar takes the bottom inset as
    // its own padding, so its surface runs under the home indicator the way a
    // native tab bar does - insetting the whole screen instead left a strip of
    // page background below the bar, which is what made it look stuck on.
    // The shell is given the height the keyboard leaves behind, rather than
    // every screen defending itself with its own KeyboardAvoidingView.
    //
    // Those did not work here and could not: this shell is a fixed-height,
    // overflow-hidden box, so a view nested three levels inside it measures its
    // own frame against a parent that never moves. The reply box in a letter
    // thread sat under the keyboard along with its send button, and there was
    // no scrolling to it. Shrinking the window everything is laid out in fixes
    // that screen and every other one at once.
    //
    // Android is already resized by the OS, so `overlap` is 0 there and this
    // is simply the window height.
    <SafeAreaView
      style={[styles.mobileSafe, { height: Math.max(0, height - keyboard.overlap) }]}
      edges={['top']}
    >
      <MobileTopBar />
      {/* Between the bar and the content so it never covers either, and is
          equally visible on whichever screen the member is on. */}
      {offline ? <OfflineBanner /> : null}
      {/* The keyboard's height is taken out of the content area rather than
          off the shell itself. Setting it on the SafeAreaView did nothing:
          that element also carries `flex: 1`, which expands to
          `flexBasis: 0; flexGrow: 1` and beats a `height` on the same node
          inside a flex parent — so the shell went on filling the window and
          the reply box stayed under the keyboard. Padding has no such fight. */}
      <View style={[styles.content, { paddingBottom: keyboard.overlap }]}>{content}</View>
      {/* The keyboard takes the tab bar's place while it is open. Keeping it
          would perch five navigation items on top of the keyboard and steal
          50pt from the one thing being typed into. */}
      {keyboard.visible ? null : <BottomTabBar />}
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
