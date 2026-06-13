import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { ApiClientError, type Plan } from '../lib/api';
import { useApiClientFactory } from '../lib/use-api-client';
import { colors, spacing, type } from '../theme';
import { Button, Card, Pill } from './primitives';

function priceLabel(plan: Plan): string {
  const dollars = plan.priceCents / 100;
  const amount = Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
  const interval =
    plan.billingInterval === 'annual'
      ? '/year'
      : plan.billingInterval === 'monthly'
        ? '/month'
        : '';
  return `${amount}${interval}`;
}

function featureLabel(plan: Plan): string | null {
  const f = plan.features;
  if (!f) return null;
  const parts: string[] = [];
  if (typeof f.photoLimit === 'number') parts.push(`${f.photoLimit} photos`);
  if (typeof f.bioWordLimit === 'number') parts.push(`${f.bioWordLimit} words`);
  return parts.length ? parts.join(' · ') : null;
}

function checkoutOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://heart-link-consumer.vercel.app';
}

/**
 * Plan-selection surface (Tier 2). Lists the listing tiers and starts a Stripe
 * Checkout session. Key-absence safe: when the API reports Stripe is not yet
 * configured ({ configured: false }), it shows a "coming soon" notice instead
 * of erroring, so the screen is shippable before Stripe products exist.
 */
export function SubscriptionPlans() {
  const apiFactory = useApiClientFactory();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const api = await apiFactory();
        const res = await api.listPlans();
        if (!active) return;
        const listing = res.plans.filter((p) => p.type === 'inmate_listing');
        setPlans(listing.length ? listing : res.plans);
      } catch (e) {
        if (!active) return;
        setError(e instanceof ApiClientError ? e.message : 'Could not load plans.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFactory]);

  const onSubscribe = useCallback(
    async (plan: Plan) => {
      setPendingPlanId(plan.id);
      setNotice(null);
      try {
        const api = await apiFactory();
        const origin = checkoutOrigin();
        const res = await api.createSubscriptionCheckout({
          planId: plan.id,
          successUrl: `${origin}/account?checkout=success`,
          cancelUrl: `${origin}/account?checkout=cancel`,
        });
        if (res.configured && res.url) {
          await Linking.openURL(res.url);
        } else {
          setNotice('Subscriptions are coming soon. Checkout is not available just yet.');
        }
      } catch (e) {
        setNotice(e instanceof ApiClientError ? e.message : 'Could not start checkout.');
      } finally {
        setPendingPlanId(null);
      }
    },
    [apiFactory],
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
      <Card style={styles.card}>
        <Text style={type.bodyMuted}>{error}</Text>
      </Card>
    );
  }
  if (!plans || plans.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={type.bodyMuted}>No plans available yet.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={type.h2}>Plans</Text>
      {notice ? (
        <Card style={[styles.card, styles.notice]}>
          <Text style={type.bodyMuted}>{notice}</Text>
        </Card>
      ) : null}
      {plans.map((plan) => {
        const features = featureLabel(plan);
        return (
          <Card key={plan.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={type.h2}>{plan.name}</Text>
              <Pill label={priceLabel(plan)} tone="gold" />
            </View>
            {features ? <Text style={type.bodyMuted}>{features}</Text> : null}
            <Button
              label="Subscribe"
              onPress={() => onSubscribe(plan)}
              loading={pendingPlanId === plan.id}
            />
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  center: { paddingVertical: spacing.xl, alignItems: 'center' },
  card: { marginTop: spacing.sm },
  notice: { borderColor: colors.gold, backgroundColor: colors.goldFaint },
  planCard: { gap: spacing.sm },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
