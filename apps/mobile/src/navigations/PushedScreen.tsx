import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../components/ScreenHeader';
import { colors, themedStyles } from '../theme';

/**
 * The frame for a screen pushed onto the root stack.
 *
 * Tab screens sit inside `AppShell`, which owns the status-bar inset for them,
 * so they are written with `edges={[]}` and start at the very top of their box.
 * A pushed screen has no shell above it: given the same box, its header drew
 * over the clock and the notch. This puts that one inset back, in one place,
 * rather than leaving each screen to remember which side of the stack it is on.
 *
 * The bottom is left alone — these screens end in their own scroll padding or a
 * pinned action bar that handles the home indicator itself.
 */
export function withSafeTop<P extends object>(Screen: ComponentType<P>) {
  function Pushed(props: P) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Screen {...props} />
      </SafeAreaView>
    );
  }
  Pushed.displayName = `withSafeTop(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Pushed;
}

/**
 * The same frame, plus the round back control and a title.
 *
 * For screens that were designed as sheets and so never drew a way out of
 * their own: a sheet is dismissed by dragging it down. Pushed instead — so the
 * edge swipe on iOS works on them like everywhere else — they need the control
 * a pushed screen has.
 */
export function withBackHeader<P extends object>(Screen: ComponentType<P>, title: string) {
  function Pushed(props: P) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={title} />
        <Screen {...props} />
      </SafeAreaView>
    );
  }
  Pushed.displayName = `withBackHeader(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Pushed;
}

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
}));
