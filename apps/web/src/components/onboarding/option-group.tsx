'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A labelled set of choice pills — the phone app's `OptionGroup`, in the
 * browser.
 *
 * Single-choice groups render as a radiogroup and multi-choice as checkboxes,
 * because a sighted member can tell the difference from the "Choose one" /
 * "Choose any" hint and a screen reader cannot. The pills are real buttons so
 * they are reachable by keyboard in source order.
 */
export function OptionGroup({
  label,
  options,
  value,
  values,
  multi,
  onSelect,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  value?: string;
  values?: string[];
  multi?: boolean;
  onSelect?: (value: string) => void;
  onToggle?: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-[13px] font-semibold text-ink">{label}</legend>
        <span className="text-[12px] text-ink-faint">{multi ? 'Choose any' : 'Choose one'}</span>
      </div>

      <div className="flex flex-wrap gap-2" role={multi ? undefined : 'radiogroup'}>
        {options.map((option) => {
          const selected = multi ? !!values?.includes(option) : value === option;
          return (
            <button
              key={option}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={selected}
              onClick={() => (multi ? onToggle?.(option) : onSelect?.(option))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                selected
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line bg-surface-elevated text-ink hover:bg-surface-muted',
              )}
            >
              {multi && selected ? <Check className="size-3" aria-hidden /> : null}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
