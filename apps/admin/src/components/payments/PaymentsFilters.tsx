'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useCallback, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { PAYMENT_METHODS } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import { Select } from '../ui/select';

const METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  mail_check: 'Check',
  mail_money_order: 'Money Order',
  stripe: 'Stripe',
  manual: 'Manual',
};

export function PaymentsFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('offset');
      startTransition(() => {
        router.replace(`?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  const [searchLocal, setSearchLocal] = useState(params.get('q') ?? '');
  useEffect(() => {
    const id = setTimeout(() => {
      updateParam('q', searchLocal || null);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const currentMethod = params.get('method') ?? '';
  const currentRange = params.get('range') ?? 'last_30_days';

  return (
    <div className={cn('flex w-full items-start gap-3', isPending && 'opacity-70')}>
      <Select
        size="sm"
        aria-label="Payment method"
        value={currentMethod}
        onValueChange={(v) => updateParam('method', v || null)}
        className="w-[160px]"
        options={[
          { value: '', label: 'Method: All' },
          ...PAYMENT_METHODS.map((m) => ({ value: m, label: `Method: ${METHOD_LABELS[m]}` })),
        ]}
      />
      <Select
        size="sm"
        aria-label="Date range"
        value={currentRange}
        onValueChange={(v) => updateParam('range', v || null)}
        className="w-[200px]"
        options={[
          { value: 'last_30_days', label: 'Date Range: Last 30 days' },
          { value: 'last_7_days', label: 'Date Range: Last 7 days' },
          { value: 'last_90_days', label: 'Date Range: Last 90 days' },
          { value: 'all', label: 'Date Range: All time' },
        ]}
      />
      <div className="flex-1">
        <label className="hl-control hl-control-focus hl-search-shell relative">
          <Search className="size-[14px] shrink-0" />
          <input
            type="text"
            placeholder="Search payer name…"
            value={searchLocal}
            onChange={(e) => setSearchLocal(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}
