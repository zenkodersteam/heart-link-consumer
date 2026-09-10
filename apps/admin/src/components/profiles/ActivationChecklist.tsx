import Link from 'next/link';
import { Check, ChevronRight, X } from 'lucide-react';
import type { ActivationBlocker, ActivationCheckResult } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';

export function ActivationChecklist({ result }: { result: ActivationCheckResult }) {
  const items = buildItems(result);
  const blockers = result.blockers ?? [];
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-5">
      <h3 className="font-serif text-base leading-6 text-text">Activation Checklist</h3>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-[13px] leading-5">
            <span
              aria-hidden
              className={cn(
                'inline-flex size-5 shrink-0 items-center justify-center rounded',
                item.ok ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger',
              )}
            >
              {item.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </span>
            {/* Label and status stack rather than sitting side by side. Side by
                side the status carried `shrink-0`, so a long one could not give
                way and pushed the whole 360px column — and the page with it —
                wider than the window. */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-text">{item.label}</span>
              <span
                className={cn(
                  'font-medium',
                  item.ok ? 'text-success' : 'text-danger',
                )}
              >
                {item.ok ? 'Ready' : item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {!result.ok && (
        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs uppercase tracking-wide text-text-muted">Active blockers</div>
          <ul className="mt-2 space-y-2">
            {blockers.map((blocker) => (
              <li key={blocker.code} className="text-sm text-text">
                <div className="font-medium">{labelForBlocker(blocker)}</div>
                <div className="text-text-muted">{blocker.reason}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {blockers.some((b) => b.code === 'listing_payment_unconfirmed') && (
              <Link href="/payments?status=matched" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface">
                Jump to payment <ChevronRight className="size-4" />
              </Link>
            )}
            {blockers.some((b) => b.code === 'photos_insufficient' || b.code === 'moderation_blocked') && (
              // A plain anchor, not a `Link`: the photos card is on this very
              // page, so there is nothing to navigate to — the browser just
              // scrolls. Routing to `/profiles/<id>#photos` re-entered the
              // same route instead, which is why this button appeared to do
              // nothing at all.
              <a href="#photos" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface">
                Jump to photos <ChevronRight className="size-4" />
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function buildItems(r: ActivationCheckResult) {
  const blockers = new Set((r.blockers ?? []).map((b) => b.code));
  return [
    {
      label: 'Application Verified',
      ok: r.details.applicationVerified,
      detail: blockers.has('application_not_verified') ? 'Verify intake packet' : 'Blocking',
    },
    {
      label: r.details.requiredPhotoCount
        ? `Photo Requirements Met (${r.details.requiredPhotoCount} approved)`
        : 'Photo Requirements Met',
      ok:
        r.details.requiredPhotoCount !== null &&
        r.details.approvedPhotoCount === r.details.requiredPhotoCount,
      detail: blockers.has('moderation_blocked')
        ? 'Moderation required'
        : // The number required comes from the plan, so until one is attached
          // there is no target. "2/? approved" reads like a bug; naming the
          // missing piece does not.
          r.details.requiredPhotoCount == null
          ? `${r.details.approvedPhotoCount} approved · needs a plan`
          : `${r.details.approvedPhotoCount}/${r.details.requiredPhotoCount} approved`,
    },
    {
      label: 'Listing Payment Confirmed',
      ok: r.details.subscriptionActive,
      detail: blockers.has('listing_payment_unconfirmed') ? 'Confirm matched payment' : 'Blocking',
    },
  ];
}

function labelForBlocker(blocker: ActivationBlocker): string {
  switch (blocker.code) {
    case 'application_not_verified':
      return 'Application not verified';
    case 'photos_insufficient':
      return 'Photo requirement incomplete';
    case 'listing_payment_unconfirmed':
      return 'Payment still needs explicit confirm';
    case 'moderation_blocked':
      return 'Moderation approval pending';
    default:
      return blocker.code;
  }
}
