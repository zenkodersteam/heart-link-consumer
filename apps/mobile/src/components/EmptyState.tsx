import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';
import { Button } from './primitives';

/**
 * UI-lift empty state: 120px gold-ringed disc, Bree Serif headline, one
 * product-truth sentence, single CTA.
 *
 * Two disc variants. `art` uses a piece from the generated registry; `icon`
 * draws a Feather glyph on the same midnight/gold/pink treatment for screens
 * with no dedicated artwork (deep-link fallbacks, sponsor entry). Optional
 * `note` carries a trust line, and `secondaryLabel` a quiet second exit.
 *
 * Sizing note: `flexGrow` (not `flex`) plus a `minHeight` floor, so the block
 * fills a pane that has a definite height AND still renders at full size inside
 * a ScrollView content container, where `flex: 1` collapses it to nothing.
 */
export function EmptyState({
  art,
  icon,
  title,
  body,
  note,
  ctaLabel,
  onPress,
  secondaryLabel,
  onSecondaryPress,
}: {
  art?: number;
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  note?: string;
  ctaLabel?: string;
  onPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.disc}>
        {art != null ? (
          <Image source={art} style={styles.discImg} contentFit="cover" />
        ) : (
          <View style={styles.discIconFill}>
            <Feather name={icon ?? 'heart'} size={40} color={colors.goldBright} />
          </View>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {note ? (
        <View style={styles.note}>
          <Feather name="shield" size={13} color={colors.gold} />
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}
      {ctaLabel && onPress ? <Button label={ctaLabel} onPress={onPress} style={styles.cta} /> : null}
      {secondaryLabel && onSecondaryPress ? (
        <Button
          label={secondaryLabel}
          variant="ghost"
          onPress={onSecondaryPress}
          style={styles.secondary}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  disc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 18,
    boxShadow: '0 0 0 1px rgba(214,168,79,0.35), 0 12px 28px rgba(46,18,64,0.14)',
  },
  discImg: { width: '100%', height: '100%' },
  // Icon variant holds the locked art direction: midnight base, gold subject,
  // one pink glow.
  discIconFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A0A26',
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(58% 58% at 66% 26%, rgba(219, 2, 82,0.38), transparent 72%), ' +
          'radial-gradient(78% 78% at 50% 52%, #241031 0%, #13051D 74%)',
      } as object,
    }),
  },
  title: { ...type.h2, fontSize: 21, textAlign: 'center', marginBottom: spacing.sm },
  body: {
    ...type.bodyMuted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 20,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    maxWidth: 380,
    marginBottom: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.goldFaint,
    backgroundColor: colors.goldFaint,
  },
  noteText: { ...type.caption, flex: 1, color: colors.textSecondary },
  cta: { paddingHorizontal: 26, paddingVertical: 11 },
  secondary: { marginTop: spacing.xs, paddingVertical: 8 },
});
