import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
}));
