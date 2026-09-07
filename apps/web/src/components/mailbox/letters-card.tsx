'use client';

import { Clock, PlusCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Spinner } from '@/components/ui/spinner';
import { useLetterEntitlement, usePurchaseLetters } from '@/lib/queries';
import { cn } from '@/lib/utils';

import { LETTER_PACKS, lettersLeftText } from './lib';

/**
 * How many letters are left, and how to get more.
 *
 * While a member's own profile is in review the card says so instead of
 * showing an allowance they cannot spend yet.
 */
export function LettersCard({ profileApproved }: { profileApproved: boolean }) {
  const { data: entitlement, isPending } = useLetterEntitlement();
  const purchase = usePurchaseLetters();
  const [showPacks, setShowPacks] = useState(false);

  if (!profileApproved) {
    return (
      <div className="rounded-[--radius-card] border border-gold bg-gold-faint p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Clock className="size-4 text-gold" />
          Your profile is in review
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Letters unlock as soon as our team approves your profile, usually within a day.
        </p>
      </div>
    );
  }

  if (isPending) {
    // Hold the card's shape rather than drawing an empty heading that snaps to
    // a number a moment later.
    return (
      <div className="h-[104px] animate-pulse rounded-[--radius-card] border border-line bg-surface-muted" />
    );
  }

  const buy = (pack: 'small' | 'medium' | 'large') => {
    purchase.mutate(pack, {
      onSuccess: (result) => {
        if (result.configured && result.url) {
          window.location.href = result.url;
        } else {
          setShowPacks(false);
          toast.info('Not available yet', { description: 'Buying letters is coming soon.' });
        }
      },
      onError: () =>
        toast.error('Could not start checkout', { description: 'Please try again in a moment.' }),
    });
  };

  return (
    <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Send className="size-4 text-primary" />
        {lettersLeftText(entitlement)}
      </p>
      {entitlement ? (
        <p className="mt-1.5 text-[13px] text-ink-soft">
          {entitlement.includedRemaining === null
            ? 'Unlimited on your plan'
            : `${entitlement.includedRemaining} included this month`}
          {entitlement.creditBalance > 0 ? ` + ${entitlement.creditBalance} purchased` : ''}
        </p>
      ) : null}

      {/* An unlimited plan has nothing to top up. */}
      {entitlement && entitlement.totalRemaining !== null ? (
        showPacks ? (
          <div className="mt-3 grid gap-2">
            {LETTER_PACKS.map((pack) => (
              <button
                key={pack.key}
                type="button"
                onClick={() => buy(pack.key)}
                disabled={purchase.isPending}
                className={cn(
                  'flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm transition-colors',
                  'hover:border-primary disabled:opacity-50',
                )}
              >
                {purchase.isPending && purchase.variables === pack.key ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <span className="font-semibold text-ink">{pack.letters} letters</span>
                    <span className="text-ink-soft">{pack.price}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPacks(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
          >
            <PlusCircle className="size-3.5" />
            Buy more letters
          </button>
        )
      ) : null}
    </div>
  );
}
