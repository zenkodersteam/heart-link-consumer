import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { SubscriptionPlans } from '../../src/components/SubscriptionPlans';
import type { LetterEntitlement, MySubscription } from '../../src/lib/api';
import { humanError } from '../../src/lib/errors';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { clearMyProfileCache, useMyProfile } from '../../src/lib/use-my-profile';
import { colors, radii, spacing, type } from '../../src/theme';

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const apiFactory = useApiClientFactory();
  const [signingOut, setSigningOut] = useState(false);
  const [entitlement, setEntitlement] = useState<LetterEntitlement | null>(null);
  const [plansUnavailable, setPlansUnavailable] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const api = await apiFactory();
        const e = await api.getLetterEntitlement();
        if (active) setEntitlement(e);
        // The plan row said "No active plan" for everyone, paying members
        // included, because nothing ever asked what they were on.
        const sub = await api.getMySubscription();
        if (active) setSubscription(sub);
      } catch (e) {
        if (active) setPlansUnavailable(humanError(e, "Plan details aren't available right now."));
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFactory]);

  /**
   * Close the account. Both stores require this to be reachable in the app.
   * Irreversible, so it confirms in a real dialog first — React Native's Alert
   * does nothing at all on the web build.
   */
  async function performDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const api = await apiFactory();
      await api.deleteAccount();
      clearMyProfileCache();
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      setDeleteError(humanError(e, 'Please try again, or contact support.'));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // Shared caches are module-level and would otherwise survive into the
      // next session, leaking this member's data to whoever signs in next.
      clearMyProfileCache();
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
        {/* Identity: a row, not a stacked block. Centred it cost roughly a
            third of a phone screen before any content appeared. */}
        <View style={styles.lid}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.lidName} numberOfLines={1}>
              {profile?.displayName || 'Your account'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <Text style={styles.groupLabel}>LETTERS &amp; PLAN</Text>
        <View style={styles.subcard}>
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
              Plan:{' '}
              <Text style={styles.rowStrong}>
                {subscription === null
                  ? '...'
                  : subscription.active
                    ? subscription.planName
                    : 'No active plan'}
              </Text>
              {subscription?.active && subscription.renewsOn
                ? `  ·  renews ${new Date(subscription.renewsOn).toLocaleDateString()}`
                : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.groupLabel}>SUPPORT</Text>
        <View style={styles.subcard}>
          <View style={styles.row}>
            <Text style={styles.rowText}>Not sure what to write?</Text>
            <Pressable onPress={() => router.push('/circle' as never)}>
              <Text style={styles.rowLink}>Open Support Circle</Text>
            </Pressable>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowText}>Questions or trouble with the app?</Text>
            <Pressable onPress={() => router.push('/support' as never)}>
              <Text style={styles.rowLink}>Visit Support</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.groupLabel}>PRIVACY &amp; SAFETY</Text>
        <View style={styles.subcard}>
          <View style={styles.row}>
            <Text style={styles.rowText}>People you have blocked</Text>
            <Pressable onPress={() => router.push('/blocked' as never)}>
              <Text style={styles.rowLink}>Manage</Text>
            </Pressable>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowText}>Terms and privacy</Text>
            <Pressable onPress={() => router.push('/policy?doc=terms' as never)}>
              <Text style={styles.rowLink}>Read</Text>
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

        <Text style={styles.groupLabel}>SESSION</Text>
        <View style={styles.subcard}>
          <Pressable onPress={onSignOut} disabled={signingOut} style={styles.row}>
            <Text style={styles.rowText}>Signed in as {email}</Text>
            <Text style={styles.rowLink}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>

        <View style={styles.dangerZone}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Close your account</Text>
            <Text style={styles.dangerBody}>
              Your sign-in is removed and your personal details are erased. This cannot be undone.
            </Text>
            {deleteError ? <Text style={styles.dangerError}>{deleteError}</Text> : null}
          </View>
          <Pressable
            onPress={() => setConfirmDelete(true)}
            disabled={deleting}
            style={styles.dangerBtn}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={styles.rowDanger}>Delete</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDialog
        open={confirmDelete}
        icon="alert-triangle"
        title="Delete your account?"
        message="Your sign-in is removed and your personal details are erased. Records of payments are kept, as we are required to. This cannot be undone."
        actions={[{ label: 'Delete my account', destructive: true, onPress: () => void performDelete() }]}
        cancelLabel="Keep my account"
        onCancel={() => setConfirmDelete(false)}
        busy={deleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: 980, alignSelf: 'center' },
  lid: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.sidebar,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    boxShadow: '0 0 0 3px #fff, 0 0 0 5px rgba(214,168,79,0.6)',
  },
  avatarText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.sidebarText },
  lidName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary },
  email: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted },
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
    marginBottom: spacing.lg,
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
  groupLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingBottom: 7,
  },
  dangerZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(179,37,63,0.22)',
    backgroundColor: 'rgba(179,37,63,0.04)',
  },
  dangerTitle: { ...type.body, fontSize: 14, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  dangerBody: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  dangerError: { ...type.caption, color: colors.danger, marginTop: 6 },
  dangerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
    minWidth: 84,
    alignItems: 'center',
  },
  rowDanger: { ...type.body, color: colors.danger, fontFamily: 'Inter_600SemiBold' },
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
