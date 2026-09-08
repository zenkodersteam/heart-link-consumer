'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useLetterEntitlement, usePurchaseLetters } from '@/lib/queries';
import { cn } from '@/lib/utils';

import { LETTER_PACKS, lettersLeftText } from './lib';

/**
 * Unit price, for comparing packs at a glance.
 *
 * Derived rather than listed: the pack prices are already written once, and a
 * second hand-maintained number is a number that eventually disagrees with the
 * first. The server is authoritative on both — this is only what someone reads
 * before being sent to checkout.
 */
function eachPrice(price: string, letters: number): string {
  const total = Number(price.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(total) || letters <= 0) return '';
  return `$${(total / letters).toFixed(2)} each`;
}

/**
 * How many letters are left, and how to get more.
 *
 * A quiet card at the foot of the list column: an allowance is status, read
 * before writing, so it holds the bottom of the column the way a mail client
 * holds storage there rather than competing with the letters above it.
 *
 * Buying opens a dialog rather than expanding in place. Three prices unfolding
 * inside a 360px column pushed the list around and left no room to compare
 * them; the dialog has the width to show what each pack costs per letter, which
 * is the only question anyone is actually asking at that moment.
 *
 * A profile still in review is not handled here: the whole mailbox is covered
 * by ProfileReviewOverlay in that case, so this is only ever drawn for someone
 * who can spend an allowance.
 */
export function LettersCard() {
  const { data: entitlement, isPending } = useLetterEntitlement();
  const purchase = usePurchaseLetters();
  const [packsOpen, setPacksOpen] = useState(false);

  if (isPending) {
    // Hold the shape rather than drawing a heading that snaps to a number a
    // moment later.
    return <div className="h-[58px] animate-pulse rounded-2xl bg-surface-muted" />;
  }

  const buy = (pack: 'small' | 'medium' | 'large') => {
    purchase.mutate(pack, {
      onSuccess: (result) => {
        if (result.configured && result.url) {
          window.location.href = result.url;
        } else {
          setPacksOpen(false);
          toast.info('Not available yet', { description: 'Buying letters is coming soon.' });
        }
      },
      onError: () =>
        toast.error('Could not start checkout', { description: 'Please try again in a moment.' }),
    });
  };

  // An unlimited plan has nothing to top up, so it gets the count and no offer.
  const canTopUp = Boolean(entitlement && entitlement.totalRemaining !== null);
  const running = Boolean(entitlement && entitlement.totalRemaining !== null)
    && (entitlement?.totalRemaining ?? 0) <= 1;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border p-3 transition-colors',
          // Low on letters is worth noticing, since it is the thing that stops
          // the next letter being written — but it is not an error, so it warms
          // rather than alarms.
          running ? 'border-gold bg-gold-faint' : 'border-line bg-surface-elevated',
        )}
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            running ? 'bg-gold/20 text-gold' : 'bg-primary-faint text-primary',
          )}
        >
          <Send className="size-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">
            {lettersLeftText(entitlement)}
          </span>
          {entitlement ? (
            <span className="block truncate text-[12px] text-ink-faint">
              {entitlement.includedRemaining === null
                ? 'Unlimited on your plan'
                : `${entitlement.includedRemaining} included this month`}
              {entitlement.creditBalance > 0 ? ` · ${entitlement.creditBalance} purchased` : ''}
            </span>
          ) : null}
        </span>

        {canTopUp ? (
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => setPacksOpen(true)}
          >
            Buy more
          </Button>
        ) : null}
      </div>

      <Dialog open={packsOpen} onOpenChange={setPacksOpen}>
        <DialogContent>
          <DialogTitle>Add more letters</DialogTitle>
          <DialogDescription>
            Purchased letters never expire, and they are used only once this month&apos;s
            included letters are gone.
          </DialogDescription>

          <div className="mt-5 grid gap-2.5">
            {LETTER_PACKS.map((pack, index) => {
              const busy = purchase.isPending && purchase.variables === pack.key;
              // The largest pack, by position rather than a hardcoded key, so
              // the badge follows the list if the catalogue is reordered.
              const best = index === LETTER_PACKS.length - 1;
              return (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => buy(pack.key)}
                  disabled={purchase.isPending}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all',
                    'hover:border-primary hover:shadow-[0_8px_20px_rgba(22,5,31,0.08)]',
                    'disabled:pointer-events-none disabled:opacity-50',
                    best ? 'border-primary/40 bg-primary-faint/40' : 'border-line bg-surface-elevated',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">
                        {pack.letters} letters
                      </span>
                      {best ? (
                        <span className="rounded-pill bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary">
                          Best value
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-faint">
                      {eachPrice(pack.price, pack.letters)}
                    </span>
                  </span>

                  <span className="shrink-0 text-[15px] font-semibold text-ink">
                    {busy ? <Spinner size="sm" /> : pack.price}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-faint">
            You will be taken to our payment provider. Letters are added as soon as the
            payment settles.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
