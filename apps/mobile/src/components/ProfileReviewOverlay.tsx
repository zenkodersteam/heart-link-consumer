import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { OutsideProfileStatus } from '@heartlink/consumer-api';
import { colors, fonts, radii, spacing, type } from '../theme';
import { Button } from './primitives';

/**
 * Shown over any surface that stays locked until moderation clears the
 * member's profile (letters, mailbox threads).
 *
 * Statuses are distinct experiences, not one message with a swapped noun:
 * `draft` is an unfinished task the member controls, `pending` is a wait with
 * nothing to do, `rejected` is a fix with specific instructions. Each gets its
 * own tone, icon and call to action.
 */

type Props = {
  status: OutsideProfileStatus;
  moderationNotes?: string | null;
  /** Sends the member back into onboarding to finish or fix their profile. */
  onEditProfile?: () => void;
  /** Re-fetches the profile so an approval lands without an app restart. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

const COPY: Record<
  Exclude<OutsideProfileStatus, 'approved'>,
  { icon: keyof typeof Feather.glyphMap; accent: string; faint: string; eyebrow: string; title: string; body: string; step: number }
> = {
  draft: {
    icon: 'edit-3',
    accent: colors.primary,
    faint: colors.primaryFaint,
    eyebrow: 'Almost there',
    title: 'Finish your profile',
    body: 'Your profile is saved as a draft. Complete it and submit for review to start writing letters.',
    step: 0,
  },
  pending: {
    icon: 'clock',
    accent: colors.gold,
    faint: colors.goldFaint,
    eyebrow: 'In review',
    title: "We're reviewing your profile",
    body: 'Every profile is read by a real person before it goes live. This usually takes less than a day, and we will let you know the moment it clears.',
    step: 1,
  },
  rejected: {
    icon: 'refresh-ccw',
    accent: colors.danger,
    faint: 'rgba(214, 69, 80, 0.12)',
    eyebrow: 'Needs a change',
    title: 'One thing to fix',
    body: 'Our team could not approve your profile as written. Update it below and resubmit — this happens often and is usually a quick fix.',
    step: 0,
  },
};

const STEPS = ['Submitted', 'In review', 'Live'] as const;

/** Slow breathing pulse behind the status icon. Native driver on both platforms. */
function usePulse(enabled: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, v]);
  return v;
}

export function ProfileReviewOverlay({ status, moderationNotes, onEditProfile, onRefresh, refreshing }: Props) {
  if (status === 'approved') return null;
  const copy = COPY[status];
  const pulse = usePulse(status === 'pending');

  const ring = (delay: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [
      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + delay] }) },
    ],
  });

  return (
    <View style={styles.backdrop}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // The card is the point; let taps outside it fall through to nothing.
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <LinearGradient
            colors={[copy.faint, 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.cardGlow}
            pointerEvents="none"
          />

          <View style={styles.iconWrap}>
            {status === 'pending' ? (
              <>
                <Animated.View style={[styles.ring, { borderColor: copy.accent }, ring(0.9)]} pointerEvents="none" />
                <Animated.View style={[styles.ring, { borderColor: copy.accent }, ring(0.5)]} pointerEvents="none" />
              </>
            ) : null}
            <View style={[styles.iconCircle, { backgroundColor: copy.faint, borderColor: copy.accent }]}>
              <Feather name={copy.icon} size={26} color={copy.accent} />
            </View>
          </View>

          <Text style={[styles.eyebrow, { color: copy.accent }]}>{copy.eyebrow.toUpperCase()}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>

          {status === 'rejected' && moderationNotes ? (
            <View style={styles.notes}>
              <View style={styles.notesTop}>
                <Feather name="message-square" size={13} color={colors.danger} />
                <Text style={styles.notesLabel}>What to change</Text>
              </View>
              <Text style={styles.notesBody}>{moderationNotes}</Text>
            </View>
          ) : null}

          <View style={styles.track}>
            {STEPS.map((label, i) => {
              const done = i < copy.step;
              const active = i === copy.step;
              const tint = done || active ? copy.accent : colors.borderStrong;
              return (
                <View key={label} style={styles.trackItem}>
                  <View style={styles.trackRow}>
                    <View
                      style={[
                        styles.dot,
                        { borderColor: tint, backgroundColor: done ? tint : active ? colors.bgElevated : 'transparent' },
                      ]}
                    >
                      {done ? <Feather name="check" size={10} color={colors.onPrimary} /> : null}
                      {active ? <View style={[styles.dotCore, { backgroundColor: tint }]} /> : null}
                    </View>
                    {i < STEPS.length - 1 ? <View style={[styles.bar, { backgroundColor: i < copy.step ? copy.accent : colors.border }]} /> : null}
                  </View>
                  <Text style={[styles.trackLabel, (done || active) && { color: colors.textPrimary, fontFamily: fonts.bodySemibold }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.actions}>
            {status === 'pending' ? (
              <Button label={refreshing ? 'Checking…' : 'Check again'} variant="secondary" onPress={onRefresh} disabled={refreshing} />
            ) : (
              <Button label={status === 'rejected' ? 'Update profile' : 'Finish profile'} onPress={onEditProfile} />
            )}
          </View>

          <Text style={styles.footnote}>
            {status === 'pending'
              ? 'You can keep browsing profiles while you wait.'
              : 'Letters unlock as soon as your profile is approved.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    zIndex: 20,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 24px 60px rgba(22, 5, 31, 0.28)' } as object,
      default: { shadowColor: colors.midnight, shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
    }),
  },
  cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 190 },

  iconWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  ring: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 1.5 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, marginBottom: spacing.xs },
  title: { ...type.h1, textAlign: 'center', marginBottom: spacing.sm },
  body: { ...type.bodyMuted, textAlign: 'center', maxWidth: 340 },

  notes: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(214, 69, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214, 69, 80, 0.22)',
  },
  notesTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  notesLabel: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.danger, letterSpacing: 0.3 },
  notesBody: { ...type.body, fontSize: 14 },

  track: { flexDirection: 'row', alignSelf: 'stretch', marginTop: spacing.xl, marginBottom: spacing.lg },
  trackItem: { flex: 1 },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotCore: { width: 6, height: 6, borderRadius: 3 },
  bar: { flex: 1, height: 2, marginHorizontal: spacing.xs, borderRadius: 1 },
  trackLabel: { ...type.caption, marginTop: spacing.xs },

  actions: { alignSelf: 'stretch', gap: spacing.sm },
  footnote: { ...type.caption, textAlign: 'center', marginTop: spacing.md },
});
