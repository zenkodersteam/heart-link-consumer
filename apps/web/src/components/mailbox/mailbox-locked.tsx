import { ArrowRight, Check, Lock } from 'lucide-react';
import Link from 'next/link';

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
 * Drawn over the mailbox rather than instead of it, blurred: the folders, the
 * search and the shape of the list stay legible underneath, so what is being
 * offered is visibly the thing on the other side of the glass rather than an
 * abstract feature list. The same treatment the review overlay already uses.
 *
 * Mirrors the phone app's `MailboxLocked` so the two read as one product.
 */
export function MailboxLocked({ href = '/plans' }: { href?: string }) {
  const external = href.startsWith('http');
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Membership required"
      className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-overlay p-4 backdrop-blur-md sm:p-8"
    >
      <div className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-[28px] border border-gold/15 bg-gradient-to-b from-sidebar to-midnight px-8 py-10 text-center shadow-[0_24px_60px_rgba(22,5,31,0.4)]">
        {/* Gold hairline along the top, the same accent the nav rail uses. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        <span className="mx-auto grid size-14 place-items-center rounded-[18px] border border-gold/35 bg-gold-faint">
          <Lock className="size-6 text-gold-bright" aria-hidden />
        </span>

        <span className="mt-6 inline-block rounded-pill border border-gold/30 bg-gold-faint px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-bright">
          Membership required
        </span>

        <h2 className="mt-4 font-[family-name:var(--font-bree)] text-[30px] leading-tight text-sidebar-text">
          Unlock your mailbox
        </h2>
        <p className="mx-auto mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-sidebar-text-muted">
          Browsing and saving profiles stay free. A membership is what lets you write, and be
          written to.
        </p>

        <ul className="mx-auto mt-7 flex max-w-[19rem] flex-col gap-3 text-left">
          {[
            'Write letters to anyone you have saved',
            'Read replies scanned back into your mailbox',
            'Four letters a month on Diamond',
            'Unlimited letters on VIP',
            'Extra postage stamps any time',
          ].map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-gold-faint">
                <Check className="size-3 text-gold-bright" strokeWidth={3} aria-hidden />
              </span>
              <span className="text-[13.5px] leading-snug text-sidebar-text">{line}</span>
            </li>
          ))}
        </ul>

        {external ? (
          <a href={href} target="_blank" rel="noreferrer" className={ctaClass}>
            View plans <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : (
          <Link href={href} className={ctaClass}>
            View plans <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-sidebar-text-muted/80">
          <Lock className="size-3" aria-hidden />
          Every letter is checked by our team before it is posted
        </p>
      </div>
    </div>
  );
}

const ctaClass =
  'mt-8 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60';
