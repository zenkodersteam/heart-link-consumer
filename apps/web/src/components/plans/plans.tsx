'use client';

import type { Plan } from '@heartlink/consumer-api';
import { Check, CheckCircle2, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import {
  useCancelSubscription,
  useCreateCheckout,
  usePlans,
  useSubscription,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

import { bulletsFor, formatDate, isFeatured, priceParts, renewalNotice } from './plan-content';

/**
 * Plans, and the one place where paying happens.
 *
 * The phone app deliberately sends people here rather than charging in-app, so
 * this screen is the whole billing surface for the product: what you are on,
 * how to change it, and how to stop it.
 */
export function Plans() {
  const params = useSearchParams();
  // Set when the sponsor flow sends someone here to pay for a specific
  // listing; it also decides which of the two plan sets is shown.
  const forProfileId = params.get('profile') ?? undefined;

  const { data: plans, isPending, isError, error, refetch } = usePlans(forProfileId);
  // Which plan is already bought, so its card can say so instead of offering to
  // sell it again.
  const { data: mySubscription } = useSubscription();
  const createCheckout = useCreateCheckout();
  const router = useRouter();

  /**
   * The two things on sale, kept apart.
   *
   * A membership for the person browsing and a listing for someone inside are
   * bought by different people for different reasons, and at a glance the only
   * thing separating a $19.99 membership from a $30 listing is the price. Shown
   * as one undifferentiated grid they read as five tiers of the same product.
   */
  const membership = (plans ?? []).filter((plan) => plan.type !== 'inmate_listing');
  const listing = (plans ?? []).filter((plan) => plan.type === 'inmate_listing');

  const sections = [
    {
      key: 'membership' as const,
      title: 'Your membership',
      blurb: 'Browse profiles, save the people you want to come back to, and write.',
      plans: membership,
    },
    {
      key: 'listing' as const,
      title: 'Sponsor a listing',
      blurb: 'Pay for someone inside to have a profile. Pick the person, then the tier.',
      plans: listing,
    },
  ].filter((section) => section.plans.length > 0);

  // With only one kind on the page the headings add nothing.
  const showSectionHeadings = sections.length > 1;

  const subscribe = (plan: Plan) => {
    const origin = window.location.origin;
    const returnPath = forProfileId ? '/sponsor' : '/account';
    const base = forProfileId ? `profile=${forProfileId}&` : '';
    createCheckout.mutate(
      {
        planId: plan.id,
        profileId: forProfileId,
        successUrl: `${origin}${returnPath}?${base}checkout=success`,
        cancelUrl: `${origin}${returnPath}?${base}checkout=cancel`,
      },
      {
        onSuccess: (result) => {
          if (result.configured && result.url) {
            window.location.href = result.url;
          } else {
            toast.info('Card payment is not available just yet', {
              description: 'Please try again soon.',
            });
          }
        },
        onError: (err) =>
          toast.error('We could not start checkout', {
            description: err instanceof Error ? err.message : 'Please try again in a moment.',
          }),
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-7">
        <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">Plans</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {forProfileId
            ? 'Choose the listing that goes live for them.'
            : 'Choose what suits you. Change or stop it whenever you like.'}
        </p>
      </header>

      {forProfileId ? null : <CurrentPlan />}

      {isPending ? <PageSpinner label="Loading plans…" /> : null}

      {isError ? (
        <div className="rounded-card border border-line bg-surface-elevated p-8 text-center">
          <p className="text-sm text-ink-soft">
            {error instanceof Error
              ? error.message
              : 'We could not load plans right now. You can still use support if you need help with billing.'}
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {plans && plans.length > 0 ? (
        <>
          {sections.map((section) => (
            <section key={section.key} className={section.key === 'listing' ? 'mt-10' : undefined}>
              {showSectionHeadings ? (
                <div className="mb-4">
                  <h2 className="font-[family-name:var(--font-bree)] text-xl text-ink">
                    {section.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">{section.blurb}</p>
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {section.plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    busy={createCheckout.isPending && createCheckout.variables?.planId === plan.id}
                    disabled={createCheckout.isPending}
                    current={mySubscription?.active === true && mySubscription.planId === plan.id}
                    // A listing plan needs a person before it can be paid for,
                    // so these lead to choosing one rather than to checkout.
                    ctaLabel={section.key === 'listing' && !forProfileId ? 'Choose who to sponsor' : undefined}
                    onSubscribe={
                      section.key === 'listing' && !forProfileId
                        ? () => router.push('/browse')
                        : () => subscribe(plan)
                    }
                  />
                ))}
              </div>

              <p className="mt-6 text-center text-[13px] text-ink-faint">
                {renewalNotice(section.plans)}
              </p>
            </section>
          ))}
        </>
      ) : null}

      {plans && plans.length === 0 && !isPending ? (
        <div className="rounded-card border border-line bg-surface-elevated p-8 text-center">
          <p className="text-sm text-ink-soft">
            There are no plans to show right now. Please check back shortly.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  busy,
  disabled,
  current,
  onSubscribe,
  ctaLabel,
}: {
  plan: Plan;
  busy: boolean;
  disabled: boolean;
  /** The plan this member is already on. Marked, and not offered for sale again. */
  current?: boolean;
  onSubscribe: () => void;
  /** Overrides the default "Choose <plan>" when the button does something else. */
  ctaLabel?: string;
}) {
  const { amount, interval } = priceParts(plan);
  const featured = isFeatured(plan);

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-card border bg-surface-elevated',
        current
          ? 'border-success shadow-[0_2px_12px_rgba(22,5,31,0.06)]'
          : featured
            ? 'border-primary shadow-cta-hover lg:-translate-y-2'
            : 'border-line shadow-[0_2px_12px_rgba(22,5,31,0.06)]',
      )}
    >
      <div
        className={cn(
          'h-2',
          featured ? 'bg-gradient-to-r from-primary to-gold' : 'bg-gradient-to-r from-sidebar to-[#4e1a6b]',
        )}
      />
      <div className="flex flex-1 flex-col p-6">
        {current ? (
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-pill bg-success-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
            <Check className="size-3" strokeWidth={3} /> Current plan
          </span>
        ) : featured ? (
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-pill bg-primary-faint px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="size-3" /> Most popular
          </span>
        ) : null}

        <h2 className="font-[family-name:var(--font-bree)] text-xl text-ink">{plan.name}</h2>
        <p className="mt-2 font-[family-name:var(--font-bree)] text-4xl text-ink">
          {amount}
          {interval ? <span className="text-base text-ink-soft">{interval}</span> : null}
        </p>

        <ul className="mt-5 flex-1 space-y-2.5">
          {bulletsFor(plan).map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {line}
            </li>
          ))}
        </ul>

        {/* Never offered twice. Buying the plan you are already on starts a
            second Stripe checkout and a second subscription; the card said
            nothing about being the current one, and the button did it anyway. */}
        <Button
          className="mt-6 w-full"
          variant={current ? 'secondary' : featured ? 'primary' : 'secondary'}
          onClick={onSubscribe}
          disabled={disabled || current || busy}
        >
          {/* The label is replaced while in flight rather than sitting behind a
              spinner pinned to the left edge, which read as a broken button. */}
          {busy ? (
            <>
              <Spinner size="sm" className={featured ? 'border-white/40 border-t-white' : ''} />
              Processing…
            </>
          ) : current ? (
            'Your current plan'
          ) : (
            (ctaLabel ?? `Choose ${plan.name}`)
          )}
        </Button>
      </div>
    </article>
  );
}

/**
 * What the member is on now, and the way out of it.
 *
 * The wording is careful about what cancelling does: the period already paid
 * for is kept, so nobody presses this expecting a refund.
 */
function CurrentPlan() {
  const { data: subscription, isPending } = useSubscription();
  const cancel = useCancelSubscription();
  const [confirming, setConfirming] = useState(false);
  const [endsOn, setEndsOn] = useState<string | null>(null);

  if (isPending || !subscription?.active) return null;

  const renews = endsOn ?? subscription.renewsOn;

  const onCancel = () => {
    cancel.mutate(undefined, {
      onSuccess: (result) => {
        setEndsOn(result.accessEndsOn);
        setConfirming(false);
        toast.success(
          result.accessEndsOn
            ? `Cancelled. Your plan stays on until ${formatDate(result.accessEndsOn)}.`
            : 'Cancelled. Your plan will not renew.',
        );
      },
      onError: (err) => {
        setConfirming(false);
        toast.error('We could not cancel your plan just now', {
          description: err instanceof Error ? err.message : 'Please try again in a moment.',
        });
      },
    });
  };

  return (
    <div className="mb-7 rounded-card border border-line bg-surface-elevated p-5">
      <p className="flex items-center gap-2 font-[family-name:var(--font-bree)] text-lg text-ink">
        <CheckCircle2 className="size-[18px] text-success" />
        {subscription.planName ?? 'Your plan'}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {endsOn
          ? `Ends ${formatDate(endsOn)}. It will not renew.`
          : renews
            ? `Renews ${formatDate(renews)}.`
            : 'Active.'}
      </p>

      {endsOn ? null : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 text-sm font-semibold text-danger hover:underline"
        >
          Cancel plan
        </button>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle>Cancel your plan?</DialogTitle>
          <DialogDescription>
            {renews
              ? `Your plan stays on until ${formatDate(renews)} — you keep what you have paid for. After that it will not renew.`
              : 'Your plan will not renew. You keep the time you have already paid for.'}
          </DialogDescription>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="sm:flex-1"
              onClick={() => setConfirming(false)}
              disabled={cancel.isPending}
            >
              Keep my plan
            </Button>
            <Button
              variant="danger"
              className="sm:flex-1"
              onClick={onCancel}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? (
                <Spinner size="sm" className="border-white/40 border-t-white" />
              ) : null}
              Cancel my plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
