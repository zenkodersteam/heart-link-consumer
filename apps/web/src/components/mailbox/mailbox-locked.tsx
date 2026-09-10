import { ArrowRight, Check, Lock } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * What a free member sees where the mailbox would be.
 *
 * The secure mailbox is the line between the free tier and a paid one, and the
 * API enforces that with a 403. Left to itself that surfaced as the message
 * from the failed request beside a "Try again" button — an error state for
 * something that is not an error, offering an action that could never work.
 *
 * So this is deliberately not an error. It names the one thing they are
 * missing, shows what each paid tier includes so the choice can be made here
 * rather than on a pricing page first, and ends in a single action.
 *
 * Mirrors the phone app's `MailboxLocked` so the two read as one product.
 */
export function MailboxLocked({ href = '/plans' }: { href?: string }) {
  const external = href.startsWith('http');
  return (
    <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] bg-gradient-to-br from-sidebar to-midnight p-8 text-center shadow-[0_24px_60px_rgba(22,5,31,0.28)] sm:p-10">
        {/* Gold hairline along the top, the same accent the nav rail uses. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        <span className="mx-auto grid size-14 place-items-center rounded-full border border-gold/40 bg-white/[0.06]">
          <Lock className="size-6 text-gold-bright" aria-hidden />
        </span>

        <h2 className="mt-5 font-[family-name:var(--font-bree)] text-2xl text-sidebar-text">
          Your letters are waiting
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-relaxed text-sidebar-text-muted">
          The secure mailbox is part of a paid membership. Browsing and saving profiles stay free —
          writing and receiving letters is what a membership adds.
        </p>

        <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
          <Tier name="Diamond" line="4 letters each month" detail="Need more? Add postage stamps any time." />
          <Tier name="VIP" line="Unlimited letters" detail="No monthly limit, no stamps to buy." highlight />
        </div>

        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            See memberships
            <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : (
          <Link
            href={href}
            className="mt-7 inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            See memberships
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}

        <p className="mt-6 text-[12px] leading-relaxed text-sidebar-text-muted/80">
          Every letter is checked by our team before it is printed and posted.
        </p>
      </div>
    </div>
  );
}

function Tier({
  name,
  line,
  detail,
  highlight,
}: {
  name: string;
  line: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border p-4',
        highlight ? 'border-gold/45 bg-gold-faint' : 'border-white/10 bg-white/[0.04]',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'font-[family-name:var(--font-bree)] text-[15px]',
            highlight ? 'text-gold-bright' : 'text-sidebar-text',
          )}
        >
          {name}
        </span>
        {highlight ? (
          <span className="rounded-pill bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-bright">
            Most letters
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-sidebar-text">
        <Check className="mt-0.5 size-3.5 shrink-0 text-gold-bright" aria-hidden />
        {line}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-sidebar-text-muted">{detail}</p>
    </div>
  );
}
