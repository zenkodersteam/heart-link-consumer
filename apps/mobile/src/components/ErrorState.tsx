import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { humanError, isOffline } from '../lib/errors';
import { colors, spacing, type } from '../theme';
import { Button } from './primitives';

/**
 * The one way a screen reports that it could not load something.
 *
 * Before this, each screen printed the caught error straight into a `<Text>`,
 * so members saw things like "Network error reaching http://localhost:3000/api/
 * resources: Failed to fetch. Likely CORS, DNS, or the API is unreachable." —
 * text written for a developer's console. Anything passed here goes through
 * `humanError()` first, and a failure that never reached the API is named as
 * being offline instead of being blamed on the screen.
 *
 * Always offer the way out: every failure here is worth one more attempt, so
 * `onRetry` renders a button rather than leaving a dead end.
 */
export function ErrorState({
  error,
  fallback,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}: {
  /** The caught value, whatever it is. */
  error: unknown;
  /** Screen-specific sentence when the error itself has nothing safe to say. */
  fallback: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Inline variant for a pane or list, rather than a whole screen. */
  compact?: boolean;
}) {
  const offline = isOffline(error);
  const message = humanError(error, fallback);

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <View style={[styles.disc, offline ? styles.discOffline : null]}>
        <Feather
          name={offline ? 'wifi-off' : 'alert-circle'}
          size={compact ? 18 : 22}
          color={offline ? colors.textSecondary : colors.danger}
        />
      </View>
      <Text style={[styles.title, compact ? styles.titleCompact : null]}>
        {offline ? "You're offline" : 'That did not load'}
      </Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  wrapCompact: { paddingVertical: spacing.xl },
  disc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(179,37,63,0.10)',
    marginBottom: spacing.xs,
  },
  discOffline: { backgroundColor: colors.surfaceMuted },
  title: { ...type.h2, color: colors.textPrimary, textAlign: 'center' },
  titleCompact: { fontSize: 18 },
  body: {
    ...type.bodyMuted,
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 21,
  },
  action: { marginTop: spacing.md, minWidth: 180 },
});

/**
 * Persistent strip for when the app is cut off entirely, so the state is
 * visible even on a screen that already has its content cached.
 */
export function OfflineBanner() {
  return (
    <View style={bannerStyles.bar}>
      <Feather name="wifi-off" size={13} color={colors.textSecondary} />
      <Text style={bannerStyles.text}>No connection. Some things may be out of date.</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: { ...type.bodyMuted, fontSize: 12.5 },
});
