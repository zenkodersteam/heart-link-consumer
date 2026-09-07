'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { updatePlanSetting } from '../../lib/actions';

interface PlanSetting {
  id: string;
  name: string;
  type: string;
  priceCents: number;
  billingInterval: string;
  isActive: boolean;
  stripePriceId: string | null;
  features: Record<string, unknown>;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const num = (v: unknown): string => (typeof v === 'number' ? String(v) : '');

/** Which entitlements matter for which plan set. Listing plans are what a
 *  sponsor buys for a member; outside plans are a subscriber's own access. */
function fieldsFor(type: string): Array<{ key: string; label: string; hint: string }> {
  if (type === 'inmate_listing') {
    return [
      { key: 'photoLimit', label: 'Photos', hint: 'Approved photos required to activate' },
      {
        key: 'bioWordLimit',
        label: 'Words / letter',
        hint: 'Longest letter a member may send to someone on this tier',
      },
    ];
  }
  return [
    { key: 'swipeDailyCap', label: 'Likes / day', hint: 'Daily like limit before the paywall' },
    { key: 'letterAllowance', label: 'Letters / month', hint: 'Included letters before credits' },
  ];
}

function PlanRow({ plan }: { plan: PlanSetting }) {
  const fields = fieldsFor(plan.type);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, num(plan.features[f.key])])),
  );
  const [pending, startTransition] = useTransition();

  const dirty = fields.some((f) => values[f.key] !== num(plan.features[f.key]));

  const onSave = () => {
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = { id: plan.id };
        for (const f of fields) {
          if (values[f.key] !== '') payload[f.key] = Number(values[f.key]);
        }
        await updatePlanSetting(payload as never);
        toast.success(`${plan.name} updated. Subscribers see this on their next action.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not update the plan');
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-surface/60 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-[220px] flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{plan.name}</span>
          {!plan.isActive ? (
            <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] text-text-muted">
              inactive
            </span>
          ) : null}
          {!plan.stripePriceId ? (
            <span className="rounded-sm bg-danger-tint px-1.5 py-0.5 text-[11px] text-danger">
              no Stripe price
            </span>
          ) : null}
        </div>
        <span className="text-[12px] text-text-muted">
          {usd(plan.priceCents)} / {plan.billingInterval === 'annual' ? 'year' : 'month'} ·{' '}
          {plan.type === 'inmate_listing' ? 'Listing (sponsor buys)' : 'Subscription (member buys)'}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {fields.map((f) => (
          <div key={f.key} className="flex w-[140px] flex-col gap-1.5">
            <label
              htmlFor={`${plan.id}-${f.key}`}
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted"
              title={f.hint}
            >
              {f.label}
            </label>
            <Input
              id={`${plan.id}-${f.key}`}
              inputMode="numeric"
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder="-"
            />
          </div>
        ))}
        <Button onClick={onSave} disabled={pending || !dirty} variant={dirty ? 'primary' : 'outline'}>
          {pending ? 'Saving...' : dirty ? 'Save' : 'Saved'}
        </Button>
      </div>
    </div>
  );
}

export function PlanSettingsTable({ plans }: { plans: PlanSetting[] }) {
  // Subscriptions first: they are the ones being tuned most often, and the
  // listing tiers are already settled with the client.
  const ordered = [...plans].sort((a, b) => {
    if (a.type === b.type) return a.priceCents - b.priceCents;
    return a.type === 'inmate_listing' ? 1 : -1;
  });

  return (
    <div className="hl-table-shell w-full">
      <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
        <span className="min-w-[220px] flex-1">Plan</span>
        <span>Entitlements</span>
      </div>
      {ordered.map((p) => (
        <PlanRow key={p.id} plan={p} />
      ))}
    </div>
  );
}
