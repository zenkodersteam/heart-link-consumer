import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { art } from '../art';
import { ApiClientError, type Plan } from '@heartlink/consumer-api';
import { humanError } from '../lib/errors';
import { PREVIEW_BYPASS_AUTH, PREVIEW_PLANS } from '../lib/preview';
import { useApiClientFactory } from '../lib/use-api-client';
import { colors, cta, radii, spacing, themedStyles, type } from '../theme';
import { Card } from './primitives';

type Tier = 'basic' | 'diamond' | 'vip';

const TIER_ORDER: Tier[] = ['basic', 'diamond', 'vip'];

const TIER_META: Record<Tier, { art: number; featured?: boolean }> = {
  basic: { art: art.planBasic },
  diamond: { art: art.planDiamond, featured: true },
  vip: { art: art.planVip },
};

function tierOf(plan: Plan): Tier | null {
  const t = plan.features?.tier;
  return t === 'basic' || t === 'diamond' || t === 'vip' ? t : null;
}

/**
 * How a plan is presented: which art band it gets, and whether it is the
 * highlighted "most popular" card.
 *
 * TIER_META alone cannot answer this. It is keyed on `features.tier`, which
 * only inmate LISTING plans carry - so every outside-user plan fell through to
 * `?? 'basic'` and they all rendered with identical art and no card ever
 * became `featured`. The result was two visually identical columns with
 * nothing signalling which one to buy. Keying off plan TYPE as well fixes both
 * at the source rather than special-casing the render.
 */
function presentationFor(plan: Plan): { art: number; featured: boolean } {
  if (plan.type === 'outside_premium') {
    return { art: art.planVip, featured: true };
  }
  if (plan.type === 'outside_basic') {
    return { art: art.planBasic, featured: false };
  }
  const meta = TIER_META[tierOf(plan) ?? 'basic'];
  return { art: meta.art, featured: Boolean(meta.featured) };
}

function priceParts(plan: Plan): { amount: string; interval: string } {
  const dollars = plan.priceCents / 100;
  const amount = Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
  const interval =
    plan.billingInterval === 'annual'
      ? '/year'
      : plan.billingInterval === 'monthly'
        ? '/month'
        : '';
  return { amount, interval };
}

/**
 * Renewal + cancellation line shown under the plan columns.
 *
 * Derived from the plans actually rendered rather than hardcoded. The previous
 * copy was the literal string "Renews yearly. Cancel anytime." which was wrong
 * on both halves:
 *
 *  - "Renews yearly" was only true by accident. The loader prefers
 *    `inmate_listing` plans (all annual) and falls back to every plan, so the
 *    moment the monthly outside-user plans surface here the sentence silently
 *    becomes false. Reading the interval off the plans keeps it honest.
 *  - "Cancel anytime" used to promise a capability that did not exist: there
 *    was no cancellation endpoint and no self-serve flow in either repo, so
 *    telling a buyer they could cancel anytime, at the moment they paid, was a
 *    commitment the product could not honour. There is a real cancellation now
 *    (Account -> Plan), so the wording says so.
 */
function renewalNotice(plans: Plan[]): string {
  const intervals = new Set(plans.map((p) => p.billingInterval));
  const renews =
    intervals.size === 1
      ? intervals.has('annual')
        ? 'Renews yearly.'
        : intervals.has('monthly')
          ? 'Renews monthly.'
          : 'Renews automatically.'
      : 'Renews automatically.';
  return `${renews} Cancel anytime from your account.`;
}

/**
 * Feature bullets for a plan card.
 *
 * The two plan sets carry completely different entitlements, so they need
 * different bullets. Listing plans (what a sponsor buys for an inmate) are
 * described by photo count and letter length. Outside-user plans are described
 * by swipe cap, mailbox access and included letters - none of which the listing
 * branch reads, so before this an outside plan rendered a single generic line
 * ("Verified browsing") with no stated benefit at all.
 */
function bullets(plan: Plan): string[] {
  const f = plan.features;
  const tier = tierOf(plan);
  const out: string[] = [];

  if (plan.type === 'inmate_listing') {
    if (typeof f?.photoLimit === 'number') out.push(`${f.photoLimit} profile photos`);
    if (typeof f?.bioWordLimit === 'number') out.push(`${f.bioWordLimit} words per letter`);
    out.push('Verified browsing');
    if (tier === 'diamond' || tier === 'vip') out.push('Priority support');
    return out;
  }

  // Outside-user subscription.
  if (typeof f?.swipeDailyCap === 'number') out.push(`${f.swipeDailyCap} profiles a day`);
  out.push('Save unlimited favorites');
  if (f?.mailbox) out.push('Secure mailbox access');
  if (typeof f?.letterAllowance === 'number' && f.letterAllowance > 0) {
    out.push(`${f.letterAllowance} letters included each month`);
  }
  if (f?.prioritySupport) out.push('Priority support');
  return out;
}

/**
 * The web app, where all paying happens.
 *
 * Buying and cancelling live on the website, not in the phone app: Apple does
 * not allow this kind of web checkout for digital goods inside an iOS app, and
 * the client's decision is that there is no in-app purchase either. The phone
 * app sends people to the website and picks the change up afterwards, because
 * the payment provider tells the server directly and the app reads the result
 * from there.
 *
 * Override with EXPO_PUBLIC_WEB_APP_URL when the site moves.
 */
const WEB_APP_URL = (
  process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://heart-link-consumer-web.vercel.app'
).replace(/\/$/, '');

/** The matching page on the website, for a phone app sending someone there. */
export function webAppUrl(path: string, params: Record<string, string> = {}): string {
  const search = new URLSearchParams(params).toString();
  return `${WEB_APP_URL}${path}${search ? `?${search}` : ''}`;
}

/**
 * Card only. PayPal was removed from the plan screens by client decision; the
 * groundwork stays in the database and the API so it can be turned back on
 * without rebuilding it.
 */
type Processor = 'stripe';

/**
 * Open the website so the member can pay there.
 *
 * A browser the app can present, rather than throwing them out into Safari
 * with no way back — they return to where they were by closing it, and the
 * plan they bought is already waiting because the server was told directly.
 */
export async function openOnWeb(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

/**
 * "Choose your plan" columns (UI lift mockup): art band top, serif price,
 * pink-check feature list, featured Diamond elevation + "Most Popular" cap.
 * Mobile: Diamond full card + Basic/VIP compact tiles.
 */
interface SubscriptionPlansProps {
  /** When set, checkout is tied to this inmate profile (sponsor flow): the
   * payment webhook activates their listing instead of being a no-op. */
  profileId?: string;
  /** First name shown in sponsor-flow copy ("Choose Marcus's plan"). */
  forName?: string;
  /** Called after the member comes back from paying on the website. */
  onReturnFromWeb?: () => void;
}

/**
 * The hand-off shown in place of the plan list on a phone.
 *
 * Memberships are bought and managed on the website, and only there — so the
 * app does not list prices it cannot sell. Showing the full catalogue and then
 * sending someone to a browser the moment they chose one was the worst of both:
 * it read as a shop, and behaved as a leaflet.
 */
function PlansOnTheWeb({
  profileId,
  forName,
  onReturnFromWeb,
}: SubscriptionPlansProps) {
  const [opening, setOpening] = useState(false);

  const open = useCallback(async () => {
    setOpening(true);
    try {
      await openOnWeb(webAppUrl('/plans', profileId ? { profile: profileId } : {}));
      // Back from the website: anything bought there is already recorded
      // against the account, so tell the screen to reload rather than leaving
      // a stale plan on display.
      onReturnFromWeb?.();
    } finally {
      setOpening(false);
    }
  }, [profileId, onReturnFromWeb]);

  return (
    <View style={handoffStyles.card}>
      <View style={handoffStyles.iconWrap}>
        <Feather name="external-link" size={18} color={colors.primary} />
      </View>
      <Text style={handoffStyles.title}>
        {profileId
          ? `Sponsor ${forName ?? 'this listing'} on the web`
          : 'Memberships are managed on the web'}
      </Text>
      <Text style={handoffStyles.body}>
        {profileId
          ? 'Choosing and paying for a listing happens on the HeartLink website. It opens signed in, and anything you buy shows up here straight away.'
          : 'Choosing a plan, paying and cancelling all happen on the HeartLink website. It opens signed in, and any change shows up here straight away.'}
      </Text>
      <Pressable
        onPress={() => void open()}
        disabled={opening}
        style={({ pressed }: { pressed: boolean }) => [
          handoffStyles.button,
          pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
          opening ? { opacity: 0.7 } : null,
        ]}
      >
        {opening ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Feather name="external-link" size={15} color={colors.onPrimary} />
        )}
        <Text style={handoffStyles.buttonText}>Open the website</Text>
      </Pressable>
    </View>
  );
}

const handoffStyles = themedStyles((colors) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
    marginBottom: spacing.xs,
  },
  title: { ...type.h2, fontSize: 17 },
  body: { ...type.bodyMuted, fontSize: 14, lineHeight: 21 },
  button: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  buttonText: { ...type.button, color: colors.onPrimary, fontSize: 14 },
}));

/**
 * The phone never lists plans; it hands over to the website.
 *
 * This used to choose between the hand-off and a full catalogue rendered for
 * the web build. There is no web build any more — the site is its own Next.js
 * app — so the catalogue, its cards, its price formatting and its checkout
 * call have all gone with it. Roughly 300 lines that could not run.
 */
export function SubscriptionPlans({ profileId, forName, onReturnFromWeb }: SubscriptionPlansProps = {}) {
  return (
    <PlansOnTheWeb profileId={profileId} forName={forName} onReturnFromWeb={onReturnFromWeb} />
  );
}

const PLAN_PAD = 24;

const styles = themedStyles((colors) => ({
  wrap: { gap: spacing.md },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  notice: { borderColor: colors.gold, backgroundColor: colors.goldFaint },
  heading: { ...type.h2, fontSize: 22, textAlign: 'center' },
  sub: { ...type.bodyMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing.md },
  columns: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingVertical: spacing.lg,
  },
  columnsStacked: { flexDirection: 'column' },
  plan: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: radii.xl,
    padding: PLAN_PAD,
    paddingTop: 0,
    overflow: 'visible',
    boxShadow:
      '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06), 0 24px 48px rgba(46,18,64,0.10)',
  },
  planDesktop: { width: 268 },
  planFeatured: {
    borderWidth: 1.5,
    borderColor: 'rgba(214,168,79,0.65)',
    boxShadow: '0 24px 56px rgba(46,18,64,0.20)',
    zIndex: 2,
  },
  planFeaturedDesktop: { transform: [{ scale: 1.06 }] },
  // Micro-interaction: plan card lifts on hover (web).
  // Featured card keeps its scale while lifting.
  planHoverFeatured: {
    transform: [{ scale: 1.06 }, { translateY: -4 }],
    boxShadow: '0 30px 64px rgba(46,18,64,0.24)',
  },
  // "Most Popular" cap must sit above the art band (z-index over the part).
  cap: {
    position: 'absolute',
    top: -13,
    alignSelf: 'center',
    zIndex: 3,
    backgroundColor: colors.goldBright,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  capText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    letterSpacing: 1,
    color: colors.midnight,
  },
  // Art band: contained subject over a radial midnight fill, feathered edges.
  part: {
    height: 88,
    marginHorizontal: -PLAN_PAD,
    marginBottom: 18,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#1A0A26',
  },
  partImg: {
    width: '100%',
    height: '100%',
  },
  planName: { fontFamily: 'BreeSerif_400Regular', fontSize: 20, color: colors.textPrimary },
  price: { marginTop: 10, marginBottom: 2 },
  priceAmount: { fontFamily: 'BreeSerif_400Regular', fontSize: 34, color: colors.textPrimary },
  priceAmountSmall: { fontFamily: 'BreeSerif_400Regular', fontSize: 19, color: colors.textPrimary },
  priceInterval: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted },
  features: { marginTop: 16, marginBottom: 22, gap: 9, flexGrow: 1 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureText: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: colors.textSecondary },
  cta: {
    marginTop: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  ctaQuiet: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ctaFeatured: {
    backgroundColor: colors.primary,
    boxShadow: cta.glow,
  },
  ctaText: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.primary },
  ctaTextFeatured: { color: colors.onPrimary },
  compactRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  compactTile: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: radii.xl,
    padding: 14,
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06)',
  },
  compactPrice: { marginTop: 4 },
  reassure: {
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
}));
