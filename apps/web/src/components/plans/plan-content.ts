import type { Plan } from '@heartlink/consumer-api';

export function priceParts(plan: Plan): { amount: string; interval: string } {
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
 * Which card is highlighted.
 *
 * `features.tier` cannot answer this on its own — only inmate listing plans
 * carry it, so keying off it alone left every outside-user plan looking
 * identical with nothing signalling which one to pick.
 */
export function isFeatured(plan: Plan): boolean {
  if (plan.type === 'outside_premium') return true;
  if (plan.type === 'outside_basic') return false;
  return plan.features?.tier === 'diamond';
}

/**
 * What a plan actually gets you.
 *
 * The two plan sets carry completely different entitlements, so they need
 * different bullets: a listing plan is described by photo count and letter
 * length, an outside-user plan by browsing, mailbox and included letters.
 */
export function bulletsFor(plan: Plan): string[] {
  const features = plan.features;
  const out: string[] = [];

  if (plan.type === 'inmate_listing') {
    if (typeof features?.photoLimit === 'number') out.push(`${features.photoLimit} profile photos`);
    if (typeof features?.bioWordLimit === 'number') {
      out.push(`${features.bioWordLimit} words per letter`);
    }
    out.push('Verified browsing');
    const tier = features?.tier;
    if (tier === 'diamond' || tier === 'vip') out.push('Priority support');
    return out;
  }

  if (typeof features?.swipeDailyCap === 'number') {
    out.push(`${features.swipeDailyCap} profiles a day`);
  }
  out.push('Save unlimited favourites');
  if (features?.mailbox) out.push('Secure mailbox access');
  if (typeof features?.letterAllowance === 'number' && features.letterAllowance > 0) {
    out.push(`${features.letterAllowance} letters included each month`);
  }
  if (features?.prioritySupport) out.push('Priority support');
  return out;
}

/**
 * The renewal line under the columns.
 *
 * Read off the plans actually rendered rather than hardcoded: a fixed "Renews
 * yearly" silently becomes untrue the moment a monthly plan appears here.
 */
export function renewalNotice(plans: Plan[]): string {
  const intervals = new Set(plans.map((plan) => plan.billingInterval));
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

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'the end of your period';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
