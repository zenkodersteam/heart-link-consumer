import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../../components/EmptyState';
import { SubscriptionPlans } from '../../components/SubscriptionPlans';
import { type PublicProfileDetail } from '@heartlink/consumer-api';
import { humanError } from '../../lib/errors';
import { useApiClientFactory } from '../../lib/use-api-client';
import { useNavigation, useRoute } from '@react-navigation/native';

import type { RootNavigation, RootRoute } from '../../navigations/types';

import { colors, radii, spacing, themedStyles, type } from '../../theme';

/**
 * Sponsor flow: a (free) member pays for an incarcerated member's listing.
 * Reached from a profile's "Sponsor their membership" link or a mailed invite.
 * Checkout carries the profileId, so the payment webhook activates their
 * listing the moment the money settles.
 */
export default function SponsorScreen() {
  const navigation = useNavigation<RootNavigation>();
  const params = useRoute<RootRoute<'Sponsor'>>().params ?? {};
  const apiFactory = useApiClientFactory();

  const profileId = typeof params.profile === 'string' ? params.profile : null;
  const checkoutState = typeof params.checkout === 'string' ? params.checkout : null;

  const [profile, setProfile] = useState<PublicProfileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    (async () => {
      try {
        const api = await apiFactory();
        const p = await api.getPublicProfile(profileId);
        if (active) setProfile(p);
      } catch (e) {
        if (active) setError(humanError(e, "We couldn't load this profile just now."));
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFactory, profileId]);

  if (!profileId) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <EmptyState
          icon="gift"
          title="Sponsor a member"
          body="Sponsorship keeps someone's HeartLink profile visible and their mailbox open for real correspondence. Start from a profile so we can connect the gift to the right person."
          note="Sponsor checkout is private and tied to the selected member only after you confirm the plan."
          ctaLabel="Browse profiles"
          onPress={() => navigation.navigate('Tabs')}
          secondaryLabel="Visit support"
          onSecondaryPress={() => navigation.navigate('Support')}
        />
      </SafeAreaView>
    );
  }

  const firstName = profile?.displayName?.split(' ')[0] ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={16} color={colors.primary} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        {checkoutState === 'success' ? (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={styles.bannerText}>
              Thank you. Your sponsorship is processing; the membership activates as soon as the
              payment settles.
            </Text>
          </View>
        ) : null}
        {checkoutState === 'cancel' ? (
          <View style={styles.banner}>
            <Feather name="info" size={18} color={colors.textSecondary} />
            <Text style={styles.bannerText}>Checkout was cancelled. No charge was made.</Text>
          </View>
        ) : null}

        {error ? (
          <Text style={type.bodyMuted}>{error}</Text>
        ) : (
          <>
            {/* Who you're sponsoring */}
            <View style={styles.hero}>
              {profile?.primaryPhotoUrl ? (
                <Image source={{ uri: profile.primaryPhotoUrl }} style={styles.heroPhoto} contentFit="cover" cachePolicy="memory-disk" priority="high" />
              ) : (
                <View style={[styles.heroPhoto, styles.heroPhotoEmpty]}>
                  <Feather name="user" size={26} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.heroText}>
                <Text style={styles.heroKicker}>YOU'RE SPONSORING</Text>
                <Text style={styles.heroName}>{profile?.displayName ?? '...'}</Text>
                {profile ? (
                  <Text style={styles.heroMeta}>
                    {profile.age ? `${profile.age} · ` : ''}
                    {profile.facility.state}
                  </Text>
                ) : null}
              </View>
              <Feather name="gift" size={22} color={colors.gold} />
            </View>

            <Text style={styles.explain}>
              A membership keeps {firstName ?? 'their'} profile visible and their mailbox open.
              You pay; they connect. You can sponsor with a free account, no plan of your own
              required.
            </Text>

            <SubscriptionPlans profileId={profileId} forName={firstName ?? undefined} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  backLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primary },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  bannerSuccess: { borderColor: 'rgba(62,155,110,0.4)', backgroundColor: 'rgba(62,155,110,0.07)' },
  bannerText: { ...type.body, fontSize: 14, flex: 1, color: colors.textSecondary },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: radii.xl,
    padding: spacing.lg,
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06)',
  },
  heroPhoto: { width: 64, height: 64, borderRadius: 32 },
  heroPhotoEmpty: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 2 },
  heroKicker: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    letterSpacing: 1,
    color: colors.gold,
  },
  heroName: { fontFamily: 'BreeSerif_400Regular', fontSize: 22, color: colors.textPrimary },
  heroMeta: { ...type.caption },
  explain: { ...type.bodyMuted, fontSize: 14, lineHeight: 21 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyTitle: { ...type.h2 },
  emptyBody: { ...type.bodyMuted, textAlign: 'center', maxWidth: 320 },
  emptyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onPrimary },
}));
