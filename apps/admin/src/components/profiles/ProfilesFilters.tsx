'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useCallback, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { Facility } from '@heartlink/api-contract';
import { PROFILE_STATUSES } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import { Select } from '../ui/select';

export function ProfilesFilters({ facilities }: { facilities: Facility[] }) {
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

  const currentStatus = params.get('status') ?? '';
  const currentFacility = params.get('facilityId') ?? '';
  const currentHasPhotos = params.get('hasPhotos') ?? '';
  const currentPayment = params.get('payment') ?? '';

  return (
    <div className={cn('flex w-full flex-wrap items-start gap-3', isPending && 'opacity-70')}>
      <FilterSelect
        label="Status"
        value={currentStatus}
        onChange={(v) => updateParam('status', v || null)}
        options={[
          { value: '', label: 'Status: All' },
          ...PROFILE_STATUSES.map((s) => ({ value: s, label: s })),
        ]}
        width="w-[180px]"
      />
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
      <FilterSelect
        label="Has photos"
        value={currentHasPhotos}
        onChange={(v) => updateParam('hasPhotos', v || null)}
        options={[
          { value: '', label: 'Has Photos: Any' },
          { value: 'yes', label: 'Has Photos: Yes' },
          { value: 'no', label: 'Has Photos: No' },
        ]}
        width="w-[180px]"
      />
      <FilterSelect
        label="Payment"
        value={currentPayment}
        onChange={(v) => updateParam('payment', v || null)}
        options={[
          { value: '', label: 'Payment: Any' },
          { value: 'confirmed', label: 'Payment: Confirmed' },
          // Previously "Pending" and "Unmatched" as separate choices, which the
          // listing has no way to tell apart — both simply mean the listing fee
          // is not confirmed, which is the distinction the activation gate makes.
          { value: 'unconfirmed', label: 'Payment: Not confirmed' },
        ]}
        width="w-[200px]"
      />
      <div className="flex-1 min-w-[200px]">
        <label className="hl-control hl-control-focus hl-search-shell relative">
          <Search className="size-[14px] shrink-0" />
          <input
            type="text"
            placeholder="Search by name..."
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
