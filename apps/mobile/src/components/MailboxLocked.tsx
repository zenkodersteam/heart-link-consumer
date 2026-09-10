import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, type } from '../theme';

/**
 * What a free member sees where the mailbox would be.
 *
 * The secure mailbox is the line between the free tier and a paid one, and the
 * API enforces that with a 403. Left to itself that surfaces as "something went
 * wrong", which is both untrue and a dead end — the member has done nothing
 * wrong and there is a way forward.
 *
 * So this is deliberately not an error state. It names the one thing they are
 * missing, lists what a membership actually buys so the decision can be made
 * here rather than on a pricing page first, and ends in a single action.
 *
 * Drawn over the mailbox rather than instead of it, behind a blur: the folders
 * and the shape of the list stay legible underneath, so what is being offered
 * is visibly the thing on the other side of the glass rather than an abstract
 * feature list.
 */
export function MailboxLocked({ onSeePlans }: { onSeePlans: () => void }) {
  return (
    <BlurView intensity={28} tint="dark" style={styles.wrap}>
      <LinearGradient
        colors={[colors.sidebar, colors.midnight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Gold hairline along the top, the same accent the nav rail uses. */}
        <View style={styles.hairline} />

        <View style={styles.lockRing}>
          <Feather name="lock" size={22} color={colors.goldBright} />
        </View>

        <Text style={styles.eyebrow}>MEMBERSHIP REQUIRED</Text>
        <Text style={styles.title}>Unlock your mailbox</Text>
        <Text style={styles.body}>
          Browsing and saving profiles stay free. A membership is what lets you write, and be
          written to.
        </Text>

        <View style={styles.points}>
          {[
            'Write letters to anyone you have saved',
            'Read replies scanned back into your mailbox',
            'Four letters a month on Diamond',
            'Unlimited letters on VIP',
            'Extra postage stamps any time',
          ].map((line) => (
            <View key={line} style={styles.point}>
              <View style={styles.tick}>
                <Feather name="check" size={11} color={colors.goldBright} />
              </View>
              <Text style={styles.pointText}>{line}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onSeePlans}
          accessibilityRole="button"
          style={({ pressed }: { pressed: boolean }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>View plans</Text>
          <Feather name="external-link" size={15} color={colors.onPrimary} />
        </Pressable>

        <Text style={styles.foot}>
          Memberships are bought on the HeartLink website — this opens it in your browser. Every
          letter is checked by our team before it is printed and posted.
        </Text>
      </LinearGradient>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...type.caption,
    color: colors.goldBright,
    letterSpacing: 1.6,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  points: { gap: spacing.sm, alignSelf: 'stretch', paddingHorizontal: spacing.xs },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 168, 79, 0.16)',
    marginTop: 1,
  },
  pointText: { ...type.body, fontSize: 13.5, color: colors.sidebarText, flex: 1, lineHeight: 19 },
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    padding: spacing.lg,
    justifyContent: 'center',
    // A wash over the blur: the blur alone leaves the list legible enough to
    // read, which reads as a page still loading rather than one behind glass.
    backgroundColor: 'rgba(22, 5, 31, 0.55)',
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    gap: spacing.md,
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.goldFaint,
  },
  lockRing: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 145, 46, 0.14)',
    borderWidth: 1,
    borderColor: colors.goldFaint,
  },
  title: {
    ...type.h2,
    color: colors.sidebarText,
  },
  body: {
    ...type.body,
    color: colors.sidebarTextMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.goldFaint,
  },
  badgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.goldBright,
  },
  cta: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.onPrimary,
  },
  foot: {
    ...type.caption,
    color: colors.sidebarTextMuted,
    textAlign: 'center',
  },
});
