'use client';

import type { ListPublicProfilesQuery, ProfileGender } from '@heartlink/consumer-api';
import { Check, ChevronDown, RotateCcw, User, Users } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const AGE_RANGES = [
  { label: 'Any age', min: undefined, max: undefined },
  { label: '18 - 25', min: 18, max: 25 },
  { label: '25 - 45', min: 25, max: 45 },
  { label: '45 - 65', min: 45, max: 65 },
  { label: '65+', min: 65, max: undefined },
] as const;

const GENDERS: { label: string; value: ProfileGender | undefined; icon: typeof User }[] = [
  { label: 'Men', value: 'male', icon: User },
  { label: 'Women', value: 'female', icon: User },
  { label: 'Both', value: undefined, icon: Users },
];

const STATES = [
  'CA', 'TX', 'FL', 'NY', 'OH', 'GA', 'PA', 'IL', 'MI', 'NC', 'AZ', 'TN',
] as const;

/**
 * The three chips above the deck, as the client screens have them.
 *
 * Each opens a menu rather than being a control in its own right, which keeps
 * the row to one line on a phone — the designs put the same three there, with
 * the gender one opening a sheet.
 */
export function FilterBar({
  query,
  onChange,
  onReset,
}: {
  query: ListPublicProfilesQuery;
  onChange: (next: ListPublicProfilesQuery) => void;
  onReset: () => void;
}) {
  const age =
    AGE_RANGES.find((range) => range.min === query.ageMin && range.max === query.ageMax) ??
    AGE_RANGES[0];
  const gender = GENDERS.find((option) => option.value === query.gender);
  const dirty = Boolean(query.ageMin || query.ageMax || query.state || query.gender);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <FilterChip label={`Age: ${age.label}`}>
        {AGE_RANGES.map((range) => (
          <DropdownMenuItem
            key={range.label}
            onSelect={() => onChange({ ...query, ageMin: range.min, ageMax: range.max })}
          >
            <span className={cn(range === age && 'font-semibold text-primary')}>{range.label}</span>
            {range === age ? <Check className="ml-auto size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </FilterChip>

      <FilterChip label={`Location: ${query.state ?? 'All'}`}>
        <DropdownMenuItem onSelect={() => onChange({ ...query, state: undefined })}>
          <span className={cn(!query.state && 'font-semibold text-primary')}>All</span>
          {!query.state ? <Check className="ml-auto size-4 text-primary" /> : null}
        </DropdownMenuItem>
        {STATES.map((state) => (
          <DropdownMenuItem key={state} onSelect={() => onChange({ ...query, state })}>
            <span className={cn(query.state === state && 'font-semibold text-primary')}>{state}</span>
            {query.state === state ? <Check className="ml-auto size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </FilterChip>

      <FilterChip label={`Gender: ${gender?.label ?? 'Both'}`}>
        <p className="px-3 pb-1.5 pt-1 text-[12px] text-ink-faint">
          Select who you&apos;d like to connect with
        </p>
        {GENDERS.map((option) => {
          const selected = option.value === query.gender;
          return (
            <DropdownMenuItem
              key={option.label}
              onSelect={() => onChange({ ...query, gender: option.value })}
              // A gap between rows, so the selected one and the one under the
              // cursor read as two states rather than a single block of colour
              // running down the menu.
              className={cn(
                'my-0.5',
                selected && 'bg-sidebar text-sidebar-text focus:bg-sidebar',
              )}
            >
              <option.icon className="size-4" />
              {option.label}
              {selected ? <Check className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </FilterChip>

      {dirty ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2 py-2 text-[13.5px] font-semibold text-primary hover:underline"
        >
          Reset
          <RotateCcw className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function FilterChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-elevated px-4 py-2.5 text-[13.5px] text-ink shadow-[0_2px_8px_rgba(46,18,64,0.06)] transition-colors hover:border-primary"
        >
          {label}
          <ChevronDown className="size-4 text-ink-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
