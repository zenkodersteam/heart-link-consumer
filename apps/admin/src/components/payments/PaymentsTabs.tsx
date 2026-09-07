'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { PaymentCounts } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';

const TABS: Array<{
  key: 'all' | 'unmatched' | 'matched' | 'confirmed' | 'exception';
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'unmatched', label: 'Unmatched' },
  { key: 'matched', label: 'Matched' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'exception', label: 'Exception' },
];

export function PaymentsTabs({ counts }: { counts: PaymentCounts }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = (params.get('tab') ?? 'all') as
    | 'all'
    | 'unmatched'
    | 'matched'
    | 'confirmed'
    | 'exception';

  const switchTab = (next: typeof current) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'all') sp.delete('tab');
    else sp.set('tab', next);
    sp.delete('offset');
    startTransition(() => {
      router.replace(`?${sp.toString()}`, { scroll: false });
    });
  };

  return (
    <nav
      className={cn('flex items-center gap-1 border-b border-border', isPending && 'opacity-70')}
    >
      {TABS.map((tab) => {
        const active = tab.key === current;
        const count =
          tab.key === 'all'
            ? counts.all
            : tab.key === 'unmatched'
              ? counts.unmatched + counts.received
              : counts[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTab(tab.key)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium leading-5 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'rounded-md border border-primary text-primary'
                : 'rounded-md text-text-muted hover:bg-surface hover:text-text',
            )}
          >
            {tab.label} ({count})
          </button>
        );
      })}
    </nav>
  );
}
