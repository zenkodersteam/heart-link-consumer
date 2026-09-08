'use client';

import { Check } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * A labelled set of choice pills — the phone app's `OptionGroup`, in the
 * browser.
 *
 * Each group is a tinted card with a gold heading, which is what the phone does
 * and what the website was missing: without the card the questions ran together
 * as one long list of chips with no sense of where one ended and the next
 * began. Every value here maps exactly onto the phone's — `bgDeep` is
 * `surface`, `radii.lg` is `--radius-card`, `border` is `line` — so the two are
 * the same thing rather than an approximation of it.
 *
 * Single-choice groups render as a radiogroup and multi-choice as checkboxes,
 * because a sighted member can tell the difference from the "Choose one" /
 * "Choose any" hint and a screen reader cannot. The pills are real buttons so
 * they are reachable by keyboard in source order.
 *
 * The group is named with `aria-labelledby` rather than a `legend`. A legend
 * only names its fieldset when it is a direct child of one, and this heading
 * has to sit in a row beside the hint — so the legend that was here named
 * nothing, and the questions were announced as an unlabelled group of buttons.
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
  const headingId = useId();

  return (
    <fieldset
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          id={headingId}
          className="text-[11px] font-bold uppercase tracking-[1.1px] text-gold"
        >
          {label}
        </span>
        <span className="text-[11px] text-ink-faint">{multi ? 'Choose any' : 'Choose one'}</span>
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
                'inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2.5 text-[13px] transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                selected
                  // Filled rather than tinted, and lifted: a soft pink wash on
                  // this warm card sat too close to the card itself to read as
                  // chosen.
                  ? 'border-primary bg-primary text-on-primary shadow-[0_4px_12px_rgba(219,2,82,0.28)]'
                  // White on the tinted card, so an unpicked chip still reads
                  // as a control rather than as part of the card.
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
