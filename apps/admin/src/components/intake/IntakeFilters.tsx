'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useCallback, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { Facility } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';
import { Select } from '../ui/select';

export function IntakeFilters({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Reset pagination when filters change
      next.delete('offset');
      startTransition(() => {
        router.replace(`?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  // Debounced search
  const [searchLocal, setSearchLocal] = useState(params.get('search') ?? '');
  useEffect(() => {
    const id = setTimeout(() => {
      updateParam('search', searchLocal || null);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const currentFacility = params.get('facilityId') ?? '';

  return (
    <div className={cn('flex w-full items-start gap-3', isPending && 'opacity-70')}>
      <FilterSelect
        label="Facility"
        value={currentFacility}
        onChange={(v) => updateParam('facilityId', v || null)}
        options={[
          { value: '', label: 'Facility: All' },
          ...facilities.map((f) => ({ value: f.id, label: f.name })),
        ]}
        width="w-[200px]"
      />
      <div className="flex-1">
        <label className="hl-control hl-control-focus hl-search-shell relative">
          <Search className="size-[14px] shrink-0" />
          <input
            type="text"
            placeholder="Search by name or app number..."
            value={searchLocal}
            onChange={(e) => setSearchLocal(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  width,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width?: string;
}) {
  return (
    <Select
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={onChange}
      options={options}
      className={cn('transition-all active:scale-[0.97]', width)}
    />
  );
}
