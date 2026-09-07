import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { ScreenHeader, SettingsRow } from '../../src/components/ScreenHeader';
import { SubscriptionPlans } from '../../src/components/SubscriptionPlans';
import type { LetterEntitlement, MySubscription } from '@heartlink/consumer-api';
import { humanError } from '../../src/lib/errors';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { clearMyProfileCache, useMyProfile } from '../../src/lib/use-my-profile';
import { colors, radii, spacing, type } from '../../src/theme';

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  // Set by the link the payment provider sends people back to. Without this the
  // return from checkout looked identical to opening the tab normally, so there
  // was no sign the payment had gone through.
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const apiFactory = useApiClientFactory();
  const [signingOut, setSigningOut] = useState(false);
  const [entitlement, setEntitlement] = useState<LetterEntitlement | null>(null);
  const [plansUnavailable, setPlansUnavailable] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Splitting settings across pushed screens is a phone pattern. On a wide
  // screen there is room to show the same things in place, and pushing a whole
  // page for two links reads as leaving the app.
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
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
        {checkout === 'success' ? (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={styles.bannerText}>
              Thank you. Your payment is processing — your plan turns on as soon as it settles,
              usually within a minute.
            </Text>
          </View>
        ) : null}
        {checkout === 'cancel' ? (
          <View style={styles.banner}>
            <Feather name="info" size={18} color={colors.textSecondary} />
            <Text style={styles.bannerText}>Checkout was cancelled. You have not been charged.</Text>
          </View>
        ) : null}

        {/* Identity: a row, not a stacked block. */}
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

        {/* At-a-glance, then everything else behind its own screen. Account was
            one long scroll of unrelated settings; each area now has a page. */}
        <View style={styles.card}>
          <SettingsRow
            icon="send"
            label="Letters"
            value={quotaLabel ?? undefined}
            onPress={() => router.push('/mailbox' as never)}
          />
          {/* Only send people into the sign-up questions when there is
              something left to answer. An approved profile landing back at
              step 1 of 9 reads as though the approval did not count. */}
          <SettingsRow
            icon="user"
            label={
              profile?.status === 'approved'
                ? 'Your profile'
                : profile?.status === 'rejected'
                  ? 'Fix and resubmit your profile'
                  : 'Finish your profile'
            }
            value={profileStatusLabel ?? undefined}
            onPress={
              // An approved member edits fields directly; someone who has not
              // finished still walks the questions, where step-by-step helps.
              profile?.status === 'approved'
                ? () => router.push('/edit-profile' as never)
                : () => router.push('/onboarding' as never)
            }
          />
          <SettingsRow
            icon="credit-card"
            label="Plan"
            value={
              subscription === null
                ? '…'
                : subscription.active
                  ? (subscription.planName ?? 'Active')
                  : 'No active plan'
            }
            onPress={isDesktop ? undefined : () => router.push('/plans' as never)}
            last
          />
        </View>

        <Text style={styles.groupLabel}>SETTINGS</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="shield"
            label="Privacy & safety"
            onPress={
              isDesktop
                ? () => router.push('/policy?doc=terms' as never)
                : () => router.push('/privacy-safety' as never)
            }
          />
          <SettingsRow
            icon="life-buoy"
            label="Support"
            onPress={() => router.push('/support' as never)}
          />
          <SettingsRow
            icon="message-circle"
            label="Support Circle"
            onPress={() => router.push('/circle' as never)}
            last
          />
        </View>

        <Text style={styles.groupLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="log-out"
            label={signingOut ? 'Signing out…' : 'Sign out'}
            onPress={onSignOut}
          />
          <SettingsRow
            icon="trash-2"
            label="Delete account"
            danger
            onPress={() => setConfirmDelete(true)}
            last
          />
        </View>

        {deleteError ? <Text style={styles.deleteError}>{deleteError}</Text> : null}

        {isDesktop ? (
          <View style={{ marginTop: spacing.lg }}>
            <SubscriptionPlans />
          </View>
        ) : null}

        {plansUnavailable ? (
          <View style={styles.notice}>
            <Feather name="wifi-off" size={15} color={colors.gold} />
            <Text style={styles.noticeText}>{plansUnavailable}</Text>
          </View>
        ) : null}
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.md,
  },
  bannerSuccess: { borderColor: colors.success, backgroundColor: 'rgba(46,138,87,0.08)' },
  bannerText: { ...type.bodyMuted, flex: 1, lineHeight: 20 },
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
  card: {
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
  deleteError: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: colors.danger, paddingHorizontal: 4, marginBottom: spacing.md },
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
