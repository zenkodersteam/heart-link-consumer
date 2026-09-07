import { Check } from 'lucide-react';
import type { PaymentDetail } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';

/**
 * The two steps this screen exists to walk through, and which one you are on.
 *
 * Matching a payment is match-then-confirm, but the screen never said so: the
 * confirm panel only appears once a match exists, so on arriving you saw a
 * search box with no indication that anything followed it, or that confirming
 * is the step that actually releases the listing.
 *
 * Driven by the payment's own status rather than local state, so a reload or a
 * colleague working the same payment shows the same position.
 */
type StepState = 'done' | 'current' | 'todo';

function statesFor(status: PaymentDetail['status']): [StepState, StepState] {
  switch (status) {
    case 'confirmed':
      return ['done', 'done'];
    case 'matched':
      return ['done', 'current'];
    case 'refunded':
    case 'exception':
      // Neither step applies any more; both read as unfinished rather than
      // pretending progress on a payment that has been taken out of the flow.
      return ['todo', 'todo'];
    default:
      return ['current', 'todo'];
  }
}

const NOTE: Partial<Record<PaymentDetail['status'], string>> = {
  exception: 'This payment is flagged as an exception and is out of the normal flow.',
  refunded: 'This payment was refunded, so there is nothing left to confirm.',
  confirmed: 'Confirmed. The listing it pays for can now be activated.',
};

export function MatchFlowSteps({ payment }: { payment: PaymentDetail }) {
  const [first, second] = statesFor(payment.status);
  const note = NOTE[payment.status];

  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <Step
          index={1}
          state={first}
          title="Match to a listing"
          detail="Find the application or profile this money was sent for."
        />
        <Step
          index={2}
          state={second}
          title="Confirm the payment"
          detail="Confirming is what lets the listing go live."
        />
      </ol>
      {note ? <p className="mt-4 text-[13px] text-text-muted">{note}</p> : null}
    </section>
  );
}

function Step({
  index,
  state,
  title,
  detail,
}: {
  index: number;
  state: StepState;
  title: string;
  detail: string;
}) {
  return (
    <li
      className={cn(
        'flex min-w-0 flex-1 items-start gap-3 rounded-lg border p-3 transition-colors',
        state === 'current' && 'border-primary/40 bg-primary/[0.04]',
        state === 'done' && 'border-border bg-surface/60',
        state === 'todo' && 'border-border border-dashed',
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
          state === 'done' && 'bg-success-tint text-success',
          state === 'current' && 'bg-primary text-white',
          state === 'todo' && 'bg-surface text-text-muted',
        )}
      >
        {state === 'done' ? <Check className="size-3.5" /> : index}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            'text-[13px] font-medium',
            state === 'todo' ? 'text-text-muted' : 'text-text',
          )}
        >
          {title}
        </span>
        <span className="text-[12px] leading-4 text-text-muted">{detail}</span>
      </span>
    </li>
  );
}
