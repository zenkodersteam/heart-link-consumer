'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { ApplicationStatus } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';

/**
 * Status tab chips above the intake table (Relevance AI queue pattern). "All"
 * plus the working statuses; counts come from the list response's
 * statusCounts aggregate so they respect the facility/date filters. Less
 * common packet-stage statuses stay reachable through the All tab.
 */

const TABS: { value: ApplicationStatus | ''; label: string; attention?: boolean }[] = [
  { value: '', label: 'All' },
  { value: 'needs_review', label: 'Needs Review', attention: true },
  { value: 'incomplete', label: 'Incomplete', attention: true },
  { value: 'scanned', label: 'Scanned' },
  { value: 'ocr_processed', label: 'OCR Processed' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

export function IntakeStatusTabs({
  statusCounts,
  total,
}: {
  statusCounts: Partial<Record<ApplicationStatus, number>>;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = params.get('status') ?? '';

  const allCount = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);

  const select = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('status', value);
    else next.delete('status');
    next.delete('offset');
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  };

  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className={cn(
        'flex flex-wrap items-center gap-2',
        isPending && 'opacity-70',
      )}
    >
      {TABS.map((tab) => {
        const count = tab.value === '' ? allCount : (statusCounts[tab.value] ?? 0);
        const active = current === tab.value;
        return (
          <button
            key={tab.value || 'all'}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => select(tab.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'border-transparent bg-gradient-to-r from-primary-hover to-primary text-primary-foreground shadow-[0_5px_14px_rgba(233,30,115,0.3)]'
                : 'border-border bg-background text-text-muted hover:border-accent-gold/50 hover:text-text hover:shadow-soft',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'min-w-[20px] rounded-full px-1.5 py-px text-center text-[11px] font-bold tabular-nums',
                active
                  ? 'bg-white/25 text-primary-foreground'
                  : tab.attention && count > 0
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface text-text-muted',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
      <span className="ml-auto text-xs text-text-muted">
        {total} shown
      </span>
    </div>
  );
}
