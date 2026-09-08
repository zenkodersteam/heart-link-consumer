'use client';

import { useState, useTransition } from 'react';
import type { PaymentDetail } from '@heartlink/api-contract';
import { toast } from 'sonner';
import { confirmPayment } from '../../lib/actions';
import { Button } from '../ui/button';
import { Select } from '../ui/select';

const PURPOSE_OPTIONS = [
  { value: 'listing', label: 'Listing activation' },
  { value: 'consumer', label: 'Consumer purchase' },
  { value: 'other', label: 'Other' },
] as const;

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

export function PaymentConfirmPanel({ payment }: { payment: PaymentDetail }) {
  const [purpose, setPurpose] = useState(payment.purpose ?? 'listing');
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      try {
        await confirmPayment({
          paymentId: payment.id,
          purpose,
          notes: notes.trim() || undefined,
        });
        // Confirming sends us back to the queue, where the payment has simply
        // left the list. Say what happened, and to what, before the row goes.
        toast.success('Payment confirmed', {
          description:
            PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? 'Recorded',
        });
      } catch (err) {
        if (isRedirectError(err)) throw err;
        toast.error(
          `Confirm failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-base leading-6 text-text">Confirm Matched Payment</h3>
          <p className="mt-1 text-sm text-text-muted">
            Finalize purpose before activation logic runs. Only listing money should activate an inmate profile.
          </p>
        </div>
        <Button onClick={onConfirm} disabled={isPending} variant="success" size="sm">
          {isPending ? 'Confirming…' : 'Confirm Payment'}
        </Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border bg-surface-muted p-4 text-sm text-text">
          <div className="text-xs uppercase tracking-wide text-text-muted">Current match context</div>
          <div className="mt-2 space-y-1">
            <div>Profile: {payment.profileId ? payment.profileId.slice(0, 8) + '…' : 'Unlinked'}</div>
            <div>Application: {payment.applicationId ? payment.applicationId.slice(0, 8) + '…' : 'None'}</div>
            <div>Subscription: {payment.subscriptionId ? payment.subscriptionId.slice(0, 8) + '…' : 'None'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            {/* The trigger is a button, so the label points at it by id rather
                than wrapping it - a wrapping label does not forward clicks. */}
            <label htmlFor="payment-purpose" className="block text-sm font-medium text-text">
              Purpose
            </label>
            <Select
              id="payment-purpose"
              className="w-full"
              value={purpose}
              onValueChange={(v) => setPurpose(v as typeof purpose)}
              disabled={isPending}
              options={PURPOSE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <label className="block text-sm font-medium text-text">
            Staff note
            <textarea
              className="hl-control mt-1 block min-h-24 w-full px-3 py-2 text-sm focus:outline-none"
              placeholder="Optional confirm note for the audit trail"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
