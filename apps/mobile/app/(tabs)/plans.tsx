import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SubscriptionPlans, openOnWeb, webAppUrl } from '../../src/components/SubscriptionPlans';
import { useToast } from '../../src/components/Toast';
import { type MySubscription } from '@heartlink/consumer-api';
import { humanError } from '../../src/lib/errors';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { colors, radii, spacing, type } from '../../src/theme';

/** Plans, on their own screen rather than buried at the bottom of Account. */
export default function PlansScreen() {
  // Bumped when the member returns from the website, so the plan they just
  // bought or cancelled there is reflected here rather than needing a restart.
  const [syncKey, setSyncKey] = useState(0);
  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader title="Membership" subtitle="What you are on, and where to change it" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <CurrentPlan key={syncKey} />
          <SubscriptionPlans onReturnFromWeb={() => setSyncKey((n) => n + 1)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The plan the member is actually on, and the way out of it.
 *
 * Cancelling, like paying, happens on the website — there is no in-app purchase
 * and no in-app billing, so the phone app sends people there instead of doing
 * it itself. On the web build the cancellation runs right here.
 *
 * The wording is careful about what cancelling does: the period already paid
 * for is kept, so nobody presses this expecting a refund.
 */
function CurrentPlan() {
  const factory = useApiClientFactory();
  const toast = useToast();
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [endsOn, setEndsOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const api = await factory();
      setSub(await api.getMySubscription());
    } catch {
      // A plan we cannot read is not worth an error on a screen whose main job
      // is showing the plans available; the picker below still works.
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, [factory]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = useCallback(async () => {
    setCancelling(true);
    try {
      const api = await factory();
      const res = await api.cancelMySubscription();
      setEndsOn(res.accessEndsOn);
      setConfirming(false);
      toast.show(
        res.accessEndsOn
          ? `Cancelled. Your plan stays on until ${formatDate(res.accessEndsOn)}.`
          : 'Cancelled. Your plan will not renew.',
      );
      await load();
    } catch (e) {
      setConfirming(false);
      toast.show(humanError(e, 'We could not cancel your plan just now.'));
    } finally {
      setCancelling(false);
    }
  }, [factory, load, toast]);

  if (loading) {
    return (
      <View style={styles.currentLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!sub?.active) return null;

  const renews = endsOn ?? sub.renewsOn;

  return (
    <View style={styles.current}>
      <View style={styles.currentTop}>
        <Feather name="check-circle" size={18} color={colors.success} />
        <Text style={styles.currentTitle}>{sub.planName ?? 'Your plan'}</Text>
      </View>
      <Text style={styles.currentMeta}>
        {endsOn
          ? `Ends ${formatDate(endsOn)}. It will not renew.`
          : renews
            ? `Renews ${formatDate(renews)}.`
            : 'Active.'}
      </Text>

      {!endsOn ? (
        <Pressable
          onPress={() => {
            if (Platform.OS === 'web') {
              setConfirming(true);
              return;
            }
            // The browser closes when they are done, and whatever they changed
            // on the website is already recorded server-side by then — so the
            // moment we get control back, ask again.
            void openOnWeb(webAppUrl('/plans')).then(() => load());
          }}
          hitSlop={8}
          style={styles.cancelLink}
        >
          <Text style={styles.cancelText}>
            {Platform.OS === 'web' ? 'Cancel plan' : 'Manage plan on the website'}
          </Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        open={confirming}
        icon="alert-circle"
        title="Cancel your plan?"
        message={
          renews
            ? `Your plan stays on until ${formatDate(renews)} — you keep what you have paid for. After that it will not renew.`
            : 'Your plan will not renew. You keep the time you have already paid for.'
        }
        actions={[{ label: 'Cancel my plan', onPress: () => void cancel(), destructive: true }]}
        cancelLabel="Keep my plan"
        onCancel={() => setConfirming(false)}
        busy={cancelling}
      />
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'the end of your period';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { paddingBottom: spacing.xxl },
  inner: { paddingHorizontal: spacing.lg },
  currentLoading: { paddingVertical: spacing.lg, alignItems: 'center' },
  current: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: 4,
  },
  currentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currentTitle: { ...type.h2, fontSize: 18, color: colors.textPrimary },
  currentMeta: { ...type.bodyMuted },
  cancelLink: { alignSelf: 'flex-start', marginTop: spacing.sm, paddingVertical: 4 },
  cancelText: { ...type.button, fontSize: 14, color: colors.danger },
});
