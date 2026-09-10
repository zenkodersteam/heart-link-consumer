import { useWindowDimensions, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { MobileTopBar } from '../components/AppNav';
import { OfflineBanner } from '../components/ErrorState';
import { useKeyboard } from '../lib/use-keyboard';
import { useSettledOffline } from '../lib/use-settled-offline';
import { colors, themedStyles } from '../theme';

/**
 * The frame every tab is drawn inside: brand bar, offline notice, content.
 *
 * It wraps the *screen* rather than the navigator, so each tab keeps its own
 * scroll position and state while the chrome stays put. The tab bar itself is
 * the navigator's, and sits below this.
 *
 * The height is what the keyboard leaves behind, which is the one place that
 * decision is made. Screens used to defend themselves with their own
 * KeyboardAvoidingViews, and inside a fixed-height shell they could not work:
 * a view nested three levels down measures against a parent that never moves.
 * Android is resized by the OS, so `overlap` is 0 there.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  const keyboard = useKeyboard();
  // Settled, not instantaneous: a single failed request used to insert the
  // banner and take it away again, shifting every screen down a row and back.
  const offline = useSettledOffline();

  return (
    <SafeAreaView
      style={[styles.safe, { height: Math.max(0, height - keyboard.overlap) }]}
      edges={['top']}
    >
      <MobileTopBar />
      {/* Between the bar and the content, so it covers neither. */}
      {offline ? <OfflineBanner /> : null}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden' },
  content: { flex: 1, backgroundColor: colors.bgDeep, overflow: 'hidden', minHeight: 0 },
}));
