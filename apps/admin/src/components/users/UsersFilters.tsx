'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Search } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Select } from '../ui/select';

const STATUS_OPTIONS = [
  { value: '', label: 'Any profile status' },
  { value: 'none', label: 'Not started' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'In review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Needs changes' },
];

/**
 * Search and filter, in the URL rather than in state.
 *
 * A staff member who has found the right member and opened them expects the
 * back button to return to the same list, and expects to be able to send that
 * list to a colleague.
 */
export function UsersFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Any change to the filter puts you back on the first page; staying on
      // page four of a different result set shows an empty table.
      next.delete('offset');
      startTransition(() => {
        router.replace(`?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  const [search, setSearch] = useState(params.get('q') ?? '');
  useEffect(() => {
    const id = setTimeout(() => updateParam('q', search || null), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className={cn('flex w-full flex-wrap items-center gap-3', isPending && 'opacity-70')}>
      <label className="hl-control flex min-w-0 flex-1 items-center gap-2 px-3 py-2 sm:max-w-sm">
        <Search aria-hidden className="size-4 shrink-0 text-text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search members"
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
        />
      </label>

      <Select
        aria-label="Profile status"
        className="w-[200px]"
        value={params.get('status') ?? ''}
        onValueChange={(value) => updateParam('status', value || null)}
        options={STATUS_OPTIONS}
      />
    </div>
  );
}
