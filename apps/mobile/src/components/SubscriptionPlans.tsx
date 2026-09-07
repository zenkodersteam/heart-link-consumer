import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
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
import { colors, cta, radii, spacing, type } from '../theme';
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
  process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://heart-link-consumer.vercel.app'
).replace(/\/$/, '');

/** Where checkout should return to. Only ever called on the web build. */
function checkoutReturnUrl(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : WEB_APP_URL;
  return `${origin}${path}${search ? `?${search}` : ''}`;
}

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
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }
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

export function SubscriptionPlans({ profileId, forName, onReturnFromWeb }: SubscriptionPlansProps = {}) {
  const apiFactory = useApiClientFactory();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ planId: string; processor: Processor } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const api = await apiFactory();
        const res = await api.listPlans();
        if (!active) return;
        // Two distinct plan sets, and showing the wrong one sells the wrong
        // product. Inmate LISTING plans (annual: Basic/Diamond/VIP) pay to put
        // an inmate's profile live, and only belong in the sponsor flow, which
        // is the flow that carries a profileId. An outside user looking at
        // their own Account is buying their OWN subscription (monthly), so they
        // must see the outside plans.
        //
        // This previously preferred listing plans in BOTH places and fell back
        // to "everything", so the Account screen sold inmate listings to
        // outside users and the outside monthly plans were never reachable.
        const wantListing = Boolean(profileId);
        const chosen = res.plans.filter((p) =>
          wantListing ? p.type === 'inmate_listing' : p.type !== 'inmate_listing',
        );
        chosen.sort((a, b) => {
          const ta = tierOf(a);
          const tb = tierOf(b);
          return (ta ? TIER_ORDER.indexOf(ta) : 99) - (tb ? TIER_ORDER.indexOf(tb) : 99);
        });
        setPlans(chosen);
      } catch (e) {
        if (!active) return;
        // In design-review mode there is no session, so fall back to the sample
        // catalogue rather than an error, matching the Home deck's behaviour.
        if (PREVIEW_BYPASS_AUTH) {
          const wantListing = Boolean(profileId);
          setPlans(
            PREVIEW_PLANS.filter((p) =>
              wantListing ? p.type === 'inmate_listing' : p.type !== 'inmate_listing',
            ),
          );
          return;
        }
        setError(humanError(e, 'We could not load plans right now. You can still use support if you need help with billing.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // profileId decides which plan set is fetched, so it belongs here.
  }, [apiFactory, profileId]);

  const onSubscribe = useCallback(
    async (plan: Plan, processor: Processor) => {
      setPending({ planId: plan.id, processor });
      setNotice(null);
      try {
        // Paying happens on the website. On a phone we hand over rather than
        // starting a checkout here, and the plan appears in the app once the
        // payment provider has told the server about it.
        if (Platform.OS !== 'web') {
          await openOnWeb(webAppUrl('/plans', profileId ? { profile: profileId } : {}));
          // Back from the website. Anything bought there is already recorded
          // against the account, so reload rather than leaving a stale screen.
          onReturnFromWeb?.();
          return;
        }

        const api = await apiFactory();
        const returnPath = profileId ? '/sponsor' : '/account';
        const base: Record<string, string> = profileId ? { profile: profileId } : {};
        const input = {
          planId: plan.id,
          profileId,
          successUrl: checkoutReturnUrl(returnPath, { ...base, checkout: 'success' }),
          cancelUrl: checkoutReturnUrl(returnPath, { ...base, checkout: 'cancel' }),
        };
        const res = await api.createSubscriptionCheckout(input);
        if (res.configured && res.url) {
          await openOnWeb(res.url);
        } else {
          setNotice('Card payment is not available just yet. Please try again soon.');
        }
      } catch (e) {
        setNotice(e instanceof ApiClientError ? e.message : 'Could not start checkout.');
      } finally {
        setPending(null);
      }
    },
    [apiFactory, profileId, onReturnFromWeb],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <Card>
        <Text style={type.bodyMuted}>{error}</Text>
      </Card>
    );
  }
  if (!plans || plans.length === 0) {
    return (
      <Card>
        <Text style={type.bodyMuted}>No plans available yet.</Text>
      </Card>
    );
  }

  const featuredPlan = plans.find((p) => presentationFor(p).featured);
  const quietPlans = plans.filter((p) => p !== featuredPlan);

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{forName ? `Choose ${forName}'s plan` : 'Choose your plan'}</Text>
      <Text style={styles.sub}>
        {forName
          ? `Your gift keeps ${forName}'s profile active: reviewed photos, secure mail, and real connection.`
          : 'Every plan includes reviewed profiles, secure mail, and the full Resources directory.'}
      </Text>
      {notice ? (
        <Card style={styles.notice}>
          <Text style={type.bodyMuted}>{notice}</Text>
        </Card>
      ) : null}

      {isDesktop || !featuredPlan ? (
        <View style={[styles.columns, !isDesktop ? styles.columnsStacked : null]}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              pending={pending}
              onSubscribe={onSubscribe}
              desktop={isDesktop}
            />
          ))}
        </View>
      ) : (
        <>
          <PlanCard plan={featuredPlan} pending={pending} onSubscribe={onSubscribe} />
          <View style={styles.compactRow}>
            {quietPlans.map((plan) => {
              const { amount, interval } = priceParts(plan);
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => onSubscribe(plan, 'stripe')}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.compactTile,
                    pressed ? { opacity: 0.8 } : null,
                  ]}
                >
                  <Text style={styles.planName} numberOfLines={1}>
        {planLabel(plan)}
      </Text>
                  <Text style={styles.compactPrice}>
                    <Text style={styles.priceAmountSmall}>{amount}</Text>
                    <Text style={styles.priceInterval}>{interval === '/year' ? '/yr' : interval}</Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      <Text style={styles.reassure}>{renewalNotice(plans)}</Text>
    </View>
  );
}

/**
 * Display name for a plan.
 *
 * The stored names carry their billing interval ("Outside Premium - Monthly")
 * and an audience prefix that only makes sense internally. Shown raw they
 * wrapped onto two lines, pushed the price off a shared baseline, and made the
 * button label long enough to spill out of its own pill.
 *
 * The interval is already printed next to the price, and each screen shows one
 * audience's plans, so both parts are redundant to the person reading it.
 */
function planLabel(plan: Plan): string {
  return plan.name
    .replace(/\s*-\s*(monthly|quarterly|annual|annually|yearly)\s*$/i, '')
    .replace(/^outside\s+/i, '')
    .trim();
}

function PlanCard({
  plan,
  pending,
  onSubscribe,
  desktop,
}: {
  plan: Plan;
  pending: { planId: string; processor: Processor } | null;
  onSubscribe: (plan: Plan, processor: Processor) => void;
  desktop?: boolean;
}) {
  const { art: planArt, featured } = presentationFor(plan);
  const { amount, interval } = priceParts(plan);
  const busy = pending?.planId === plan.id;

  return (
    <Pressable
      style={({ hovered }: { hovered?: boolean }) => [
        styles.plan,
        desktop ? styles.planDesktop : null,
        featured ? styles.planFeatured : null,
        featured && desktop ? styles.planFeaturedDesktop : null,
        hovered ? (featured && desktop ? styles.planHoverFeatured : styles.planHover) : null,
      ]}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <>
      {featured ? (
        <View style={styles.cap}>
          <Text style={styles.capText}>MOST POPULAR</Text>
        </View>
      ) : null}
      <View style={styles.part}>
        {/* Micro-interaction: plan art zooms on card hover (web). */}
        <Image
          source={planArt}
          style={[styles.partImg, hovered ? styles.partImgHover : null]}
          contentFit="contain"
        />
      </View>
      <Text style={styles.planName} numberOfLines={1}>
        {planLabel(plan)}
      </Text>
      <Text style={styles.price}>
        <Text style={styles.priceAmount}>{amount}</Text>
        <Text style={styles.priceInterval}> {interval}</Text>
      </Text>
      <View style={styles.features}>
        {bullets(plan).map((b) => (
          <View key={b} style={styles.feature}>
            <Feather name="check" size={14} color={colors.primary} />
            <Text style={styles.featureText}>{b}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => onSubscribe(plan, 'stripe')}
        disabled={busy}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.cta,
          featured ? styles.ctaFeatured : styles.ctaQuiet,
          hovered && !busy
            ? featured
              ? { transform: [{ translateY: -2 }], boxShadow: cta.glowHover }
              : { transform: [{ translateY: -2 }], boxShadow: '0 8px 20px rgba(233,30,115,0.25)' }
            : null,
          pressed && !busy ? { transform: [{ scale: 0.98 }] } : null,
          busy ? { opacity: 0.6 } : null,
        ]}
      >
        <Text
          style={[styles.ctaText, featured ? styles.ctaTextFeatured : null]}
          numberOfLines={1}
        >
          {busy && pending?.processor === 'stripe' ? 'Opening…' : `Choose ${planLabel(plan)}`}
        </Text>
      </Pressable>
        </>
      )}
    </Pressable>
  );
}

const PLAN_PAD = 24;

const styles = StyleSheet.create({
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
  planHover: {
    transform: [{ translateY: -4 }],
    boxShadow:
      '0 2px 4px rgba(46,18,64,0.06), 0 14px 28px rgba(46,18,64,0.10), 0 34px 64px rgba(46,18,64,0.14)',
    ...Platform.select({
      web: { transitionProperty: 'transform, box-shadow', transitionDuration: '160ms' } as object,
    }),
  },
  // Featured card keeps its scale while lifting.
  planHoverFeatured: {
    transform: [{ scale: 1.06 }, { translateY: -4 }],
    boxShadow: '0 30px 64px rgba(46,18,64,0.24)',
    ...Platform.select({
      web: { transitionProperty: 'transform, box-shadow', transitionDuration: '160ms' } as object,
    }),
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
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(92deg, #E8C27A, #D6A84F)' } as object,
    }),
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
    ...Platform.select({
      web: {
        backgroundImage: 'radial-gradient(70% 170% at 50% 50%, #13051D 35%, #241031 100%)',
      } as object,
    }),
  },
  partImg: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        maskImage: 'radial-gradient(85% 95% at 50% 50%, #000 38%, transparent 86%)',
        WebkitMaskImage: 'radial-gradient(85% 95% at 50% 50%, #000 38%, transparent 86%)',
        transitionProperty: 'transform',
        transitionDuration: '350ms',
      } as object,
    }),
  },
  partImgHover: { transform: [{ scale: 1.05 }] },
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
    ...Platform.select({
      web: { transitionProperty: 'transform, box-shadow', transitionDuration: '160ms' } as object,
    }),
  },
  ctaQuiet: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ctaFeatured: {
    backgroundColor: colors.primary,
    boxShadow: cta.glow,
    ...Platform.select({
      web: { backgroundImage: cta.gradientCss } as object,
    }),
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
});
