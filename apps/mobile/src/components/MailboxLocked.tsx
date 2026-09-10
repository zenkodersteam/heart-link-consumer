import { Feather } from '@expo/vector-icons';
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
 * missing, shows what each paid tier includes so the choice can be made here
 * rather than on a separate pricing page, and ends in a single action.
 */
export function MailboxLocked({ onSeePlans }: { onSeePlans: () => void }) {
  return (
    <View style={styles.wrap}>
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

        <Text style={styles.title}>Your letters are waiting</Text>
        <Text style={styles.body}>
          The secure mailbox is part of a paid membership. Browsing and saving profiles stay free —
          writing and receiving letters is what a membership adds.
        </Text>

        <View style={styles.tiers}>
          <Tier
            name="Diamond"
            line="4 letters each month"
            detail="Need more? Add postage stamps any time."
          />
          <Tier name="VIP" line="Unlimited letters" detail="No monthly limit, no stamps to buy." highlight />
        </View>

        <Pressable
          onPress={onSeePlans}
          accessibilityRole="button"
          style={({ pressed }: { pressed: boolean }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>See memberships</Text>
          <Feather name="external-link" size={15} color={colors.onPrimary} />
        </Pressable>

        <Text style={styles.foot}>
          Memberships are bought on the HeartLink website — this opens it in your browser. Every
          letter is checked by our team before it is printed and posted.
        </Text>
      </LinearGradient>
    </View>
  );
}

function Tier({
  name,
  line,
  detail,
  highlight,
}: {
  name: string;
  line: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.tier, highlight && styles.tierHighlight]}>
      <View style={styles.tierHead}>
        <Text style={[styles.tierName, highlight && styles.tierNameHighlight]}>{name}</Text>
        {highlight ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Unlimited</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.tierLine}>{line}</Text>
      <Text style={styles.tierDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
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
  tiers: { gap: spacing.sm, marginTop: spacing.xs },
  tier: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 2,
  },
  tierHighlight: {
    borderColor: colors.goldFaint,
    backgroundColor: 'rgba(201, 145, 46, 0.10)',
  },
  tierHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.sidebarText,
  },
  tierNameHighlight: { color: colors.goldBright },
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
  tierLine: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.sidebarText,
  },
  tierDetail: {
    ...type.caption,
    color: colors.sidebarTextMuted,
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
