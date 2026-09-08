'use client';

import type { OutsideProfileStatus } from '@heartlink/consumer-api';
import {
  Check,
  Clock,
  MessageSquare,
  PenLine,
  RefreshCcw,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * Covers any surface that stays locked until moderation clears the member's
 * profile — the mailbox, above all.
 *
 * An overlay rather than a notice in the page, because the surface underneath
 * is not usable: the mailbox showed a "your profile is in review" box and then
 * a search field, a compose button and an empty thread list, all of which
 * refuse to do anything. Covering it says so once instead of letting someone
 * find out control by control.
 *
 * Statuses are distinct experiences, not one message with a swapped noun:
 * `draft` is an unfinished task the member controls, `pending` is a wait with
 * nothing to do, `rejected` is a fix with specific instructions. Each gets its
 * own tone, icon and call to action. Ported from the phone app's
 * ProfileReviewOverlay.
 */

const COPY: Record<
  Exclude<OutsideProfileStatus, 'approved'>,
  {
    icon: LucideIcon;
    accent: string;
    glow: string;
    eyebrow: string;
    title: string;
    body: string;
    step: number;
  }
> = {
  draft: {
    icon: PenLine,
    accent: 'text-primary',
    glow: 'from-primary-faint',
    eyebrow: 'Almost there',
    title: 'Finish your profile',
    body: 'Your profile is saved as a draft. Complete it and submit for review to start writing letters.',
    step: 0,
  },
  pending: {
    icon: Clock,
    accent: 'text-gold',
    glow: 'from-gold-faint',
    eyebrow: 'In review',
    title: "We're reviewing your profile",
    body: 'Every profile is read by a real person before it goes live. This usually takes less than a day, and we will let you know the moment it clears.',
    step: 1,
  },
  rejected: {
    icon: RefreshCcw,
    accent: 'text-danger',
    glow: 'from-danger/10',
    eyebrow: 'Needs a change',
    title: 'One thing to fix',
    body: 'Our team could not approve your profile as written. Update it below and resubmit — this happens often and is usually a quick fix.',
    step: 0,
  },
};

const STEPS = ['Submitted', 'In review', 'Live'] as const;

export function ProfileReviewOverlay({
  status,
  moderationNotes,
  onRefresh,
  refreshing,
}: {
  status: OutsideProfileStatus;
  moderationNotes?: string | null;
  /** Re-fetches the profile so an approval lands without a reload. */
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const router = useRouter();
  const card = useRef<HTMLDivElement>(null);

  // Focus moves into the overlay so a keyboard or screen-reader user is not
  // left tabbing through the controls underneath, which is where they were
  // before this covered them.
  useEffect(() => {
    card.current?.focus();
  }, []);

  if (status === 'approved') return null;
  const copy = COPY[status];
  const Icon = copy.icon;

  return (
    <div
      className="absolute inset-0 z-20 overflow-y-auto bg-overlay backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-overlay-title"
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div
          ref={card}
          tabIndex={-1}
          className="relative w-full max-w-[420px] overflow-hidden rounded-[24px] border border-line bg-surface-elevated px-6 py-8 text-center shadow-[0_24px_60px_rgba(22,5,31,0.28)] outline-none"
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 h-[190px] bg-gradient-to-b to-transparent',
              copy.glow,
            )}
          />

          <div className="relative mx-auto mb-3 grid size-[84px] place-items-center">
            {/* A slow breath while the wait is genuinely open-ended. Nothing is
                happening on this screen, and a still icon reads as stuck. */}
            {status === 'pending' ? (
              <>
                <span className="absolute size-16 animate-review-ring rounded-full border-[1.5px] border-gold" />
                <span className="absolute size-16 animate-review-ring rounded-full border-[1.5px] border-gold [animation-delay:900ms]" />
              </>
            ) : null}
            <span
              className={cn(
                'grid size-16 place-items-center rounded-full border',
                status === 'pending' && 'border-gold bg-gold-faint',
                status === 'draft' && 'border-primary bg-primary-faint',
                status === 'rejected' && 'border-danger bg-danger/10',
              )}
            >
              <Icon className={cn('size-[26px]', copy.accent)} />
            </span>
          </div>

          <p className={cn('text-[11px] font-bold uppercase tracking-[1.2px]', copy.accent)}>
            {copy.eyebrow}
          </p>
          <h2
            id="review-overlay-title"
            className="mt-1 font-[family-name:var(--font-bree)] text-2xl text-ink"
          >
            {copy.title}
          </h2>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-ink-soft">
            {copy.body}
          </p>

          {status === 'rejected' && moderationNotes ? (
            <div className="mt-4 rounded-[14px] border border-danger/20 bg-danger/[0.08] p-3 text-left">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-danger">
                <MessageSquare className="size-3.5" />
                What to change
              </p>
              <p className="text-sm text-ink">{moderationNotes}</p>
            </div>
          ) : null}

          {/* Dots and labels are two rows rather than one column each.
              Giving every step an equal column left the last one a third of the
              width with only its dot in it, so the track stopped short and the
              right-hand side sat empty. Now the connecting bars absorb the
              space and the final dot reaches the end.

              Inset a little from the card's own padding so the outer dots do
              not sit hard against the edge, and the track reads as narrower
              than the text above it rather than wider. */}
          <div className="mt-6 mb-4 px-3">
            <div className="flex items-center">
              {STEPS.map((label, index) => {
                const done = index < copy.step;
                const active = index === copy.step;
                return (
                  <Fragment key={label}>
                    <span
                      className={cn(
                        'grid size-[18px] shrink-0 place-items-center rounded-full border-2',
                        done && 'border-current bg-current',
                        active && 'border-current bg-surface-elevated',
                        !done && !active && 'border-line-strong',
                        (done || active) && copy.accent,
                      )}
                    >
                      {done ? <Check className="size-2.5 text-on-primary" /> : null}
                      {active ? <span className="size-1.5 rounded-full bg-current" /> : null}
                    </span>
                    {index < STEPS.length - 1 ? (
                      <span
                        className={cn(
                          'mx-1.5 h-0.5 flex-1 rounded-full',
                          index < copy.step ? cn('bg-current', copy.accent) : 'bg-line',
                        )}
                      />
                    ) : null}
                  </Fragment>
                );
              })}
            </div>

            {/* Equal columns, with the outer labels pulled to the edges so each
                one sits under its own dot. */}
            <div
              className="mt-1.5 grid text-[12px]"
              style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}
            >
              {STEPS.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    index === 0
                      ? 'justify-self-start'
                      : index === STEPS.length - 1
                        ? 'justify-self-end'
                        : 'justify-self-center',
                    index <= copy.step ? 'font-semibold text-ink' : 'text-ink-faint',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {status === 'pending' ? (
            <Button variant="secondary" className="w-full" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Spinner size="sm" /> : null}
              {refreshing ? 'Checking…' : 'Check again'}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => router.push('/onboarding')}>
              {status === 'rejected' ? 'Update profile' : 'Finish profile'}
            </Button>
          )}

          <p className="mt-3 text-[12px] text-ink-faint">
            {status === 'pending'
              ? 'You can keep browsing profiles while you wait.'
              : 'Letters unlock as soon as your profile is approved.'}
          </p>
        </div>
      </div>
    </div>
  );
}
