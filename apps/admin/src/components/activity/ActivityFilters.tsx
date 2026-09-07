'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * Filters for the activity history.
 *
 * The choices for "what happened" come from the log itself rather than a
 * hard-coded list, so a newly audited action appears here without anyone
 * remembering to add it.
 */
export function ActivityFilters({ actions }: { actions: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Any change to the filters means the old page number is meaningless.
      next.delete('offset');
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => {
    const id = setTimeout(() => setParam('q', q || null), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex w-full flex-wrap items-end gap-3">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <Label htmlFor="activity-q">Who</Label>
        <label className="hl-control hl-control-focus hl-search-shell relative">
          <Search className="size-[14px] shrink-0" />
          <input
            id="activity-q"
            className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted focus:outline-none"
            placeholder="Name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      <div className="flex w-[240px] flex-col gap-1.5">
        <Label htmlFor="activity-action">What happened</Label>
        <Select
          id="activity-action"
          value={params.get('action') ?? ''}
          onValueChange={(v) => setParam('action', v || null)}
          options={[
            { value: '', label: 'Anything' },
            ...actions.map((a) => ({ value: a, label: a })),
          ]}
        />
      </div>

      <div className="flex w-[160px] flex-col gap-1.5">
        <Label htmlFor="activity-from">From</Label>
        <Input
          id="activity-from"
          type="date"
          defaultValue={params.get('dateFrom') ?? ''}
          onChange={(e) => setParam('dateFrom', e.target.value || null)}
        />
      </div>

      <div className="flex w-[160px] flex-col gap-1.5">
        <Label htmlFor="activity-to">To</Label>
        <Input
          id="activity-to"
          type="date"
          defaultValue={params.get('dateTo') ?? ''}
          onChange={(e) => setParam('dateTo', e.target.value || null)}
        />
      </div>
    </div>
  );
}
