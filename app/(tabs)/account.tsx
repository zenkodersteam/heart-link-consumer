import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubscriptionPlans } from '../../src/components/SubscriptionPlans';
import type { LetterEntitlement } from '../../src/lib/api';
import { humanError } from '../../src/lib/errors';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { useMyProfile } from '../../src/lib/use-my-profile';
import { colors, radii, spacing, type } from '../../src/theme';

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const apiFactory = useApiClientFactory();
  const [signingOut, setSigningOut] = useState(false);
  const [entitlement, setEntitlement] = useState<LetterEntitlement | null>(null);
  const [plansUnavailable, setPlansUnavailable] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const api = await apiFactory();
        const e = await api.getLetterEntitlement();
        if (active) setEntitlement(e);
      } catch (e) {
        if (active) setPlansUnavailable(humanError(e, "Plan details aren't available right now."));
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFactory]);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } finally {
      setSigningOut(false);
    }
  }

  const { profile } = useMyProfile();
  const profileStatusLabel =
    profile === null
      ? null
      : profile.status === 'approved'
        ? 'Approved'
        : profile.status === 'pending'
          ? 'In review'
          : profile.status === 'rejected'
            ? 'Needs changes'
            : 'Incomplete';

  const email = user?.primaryEmailAddress?.emailAddress ?? '-';
  const initial = (profile?.displayName?.[0] ?? email[0] ?? '?').toUpperCase();
  const quotaLabel =
    entitlement === null
      ? null
      : entitlement.totalRemaining === null
        ? 'Unlimited letters'
        : `${entitlement.totalRemaining} ${entitlement.totalRemaining === 1 ? 'letter' : 'letters'} left`;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Luma-style centered identity block */}
        <View style={styles.lid}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.email}>{email}</Text>
          <Pressable
            onPress={onSignOut}
            disabled={signingOut}
            style={({ pressed }: { pressed: boolean }) => [
              styles.signout,
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <Text style={styles.signoutText}>{signingOut ? 'Signing out...' : 'Sign out'}</Text>
          </Pressable>
        </View>

        {/* Subscription card: quota + plan rows with row-level actions */}
        <View style={styles.subcard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.kicker}>MEMBER ACCOUNT</Text>
              <Text style={styles.cardTitle}>Letters, plan, and support</Text>
            </View>
            <Feather name="shield" size={18} color={colors.gold} />
          </View>
          {quotaLabel ? (
            <View style={styles.row}>
              <Text style={styles.rowText}>
                <Text style={styles.rowStrong}>{quotaLabel}</Text> this month
              </Text>
              <Pressable onPress={() => router.push('/mailbox' as never)}>
                <Text style={styles.rowLink}>Write a letter</Text>
              </Pressable>
            </View>
          ) : null}
          {profileStatusLabel ? (
            <View style={[styles.row, quotaLabel ? styles.rowDivider : null]}>
              <Text style={styles.rowText}>
                Your profile: <Text style={styles.rowStrong}>{profileStatusLabel}</Text>
              </Text>
              <Pressable onPress={() => router.push('/onboarding' as never)}>
                <Text style={styles.rowLink}>
                  {profile?.status === 'rejected' ? 'Fix and resubmit' : 'Edit profile'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={[styles.row, quotaLabel || profileStatusLabel ? styles.rowDivider : null]}>
            <Text style={styles.rowText}>
              Plan: <Text style={styles.rowStrong}>No active plan</Text>
            </Text>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowText}>Questions or trouble with the app?</Text>
            <Pressable onPress={() => router.push('/support' as never)}>
              <Text style={styles.rowLink}>Visit Support</Text>
            </Pressable>
          </View>
          {plansUnavailable ? (
            <View style={[styles.notice, styles.rowDivider]}>
              <Feather name="wifi-off" size={16} color={colors.gold} />
              <Text style={styles.noticeText}>{plansUnavailable}</Text>
            </View>
          ) : null}
        </View>

        <SubscriptionPlans />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: spacing.xl, paddingTop: spacing.xxl, width: '100%', maxWidth: 980, alignSelf: 'center' },
  lid: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sidebar,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    boxShadow: '0 0 0 3px #fff, 0 0 0 5px rgba(214,168,79,0.6)',
  },
  avatarText: { fontFamily: 'Inter_600SemiBold', fontSize: 22, color: colors.sidebarText },
  email: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary },
  signout: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl - spacing.xs,
    backgroundColor: colors.bgElevated,
  },
  signoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textSecondary },
  subcard: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 20,
    marginBottom: spacing.xxl,
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kicker: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 1.1,
    color: colors.gold,
  },
  cardTitle: { ...type.h2, fontSize: 18, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 17,
    paddingHorizontal: 22,
    gap: spacing.md,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { ...type.body, fontSize: 14, color: colors.textSecondary },
  rowStrong: { color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  rowLink: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: colors.goldFaint,
  },
  noticeText: { ...type.caption, flex: 1, color: colors.textSecondary },
});
