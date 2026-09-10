'use client';

import {
  MONTH_NAMES,
  WEEKDAY_INITIALS,
  birthYears,
  calendarStart,
  formatDobInput,
  monthGrid,
  parseDob,
  toDisplayDate,
} from '@heartlink/consumer-content';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * A date field that can be typed or picked.
 *
 * Typing stays the primary path — someone who knows their birth date types it
 * faster than any calendar allows — so the calendar is an alternative rather
 * than a replacement, and both write the same `MM/DD/YYYY` the validation
 * already understands.
 *
 * Not `<input type="date">`: its rendering, its format and its year navigation
 * are the browser's, and for a date eighteen to a hundred years ago the year is
 * the part that matters most. This opens on a chooseable year.
 */
export function DateField({
  label,
  hint,
  error,
  value,
  onChange,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const generated = React.useId();
  const fieldId = id ?? generated;

  const [open, setOpen] = React.useState(false);
  const [pickingYear, setPickingYear] = React.useState(false);
  const start = React.useMemo(() => calendarStart(value), [value]);
  const [year, setYear] = React.useState(start.year);
  const [month, setMonth] = React.useState(start.month);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // A click anywhere else, or Escape, closes it — the two ways people dismiss
  // a popover without being told they can.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Opening shows whatever is currently typed, rather than wherever the
  // calendar was left last time. Done here rather than in an effect on `open`:
  // setting state from an effect renders the old month first and corrects it
  // on the next pass, which shows as a flicker.
  const openCalendar = () => {
    const next = calendarStart(value);
    setYear(next.year);
    setMonth(next.month);
    setPickingYear(false);
    setOpen(true);
  };

  const selectedIso = parseDob(value);
  const cells = monthGrid(year, month);

  const step = (delta: number) => {
    const next = month + delta;
    if (next < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (next > 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(next);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <label htmlFor={fieldId} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>

      <div className="relative">
        <input
          id={fieldId}
          value={value}
          onChange={(event) => onChange(formatDobInput(event.target.value))}
          placeholder="MM/DD/YYYY"
          inputMode="numeric"
          maxLength={10}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-12 w-full rounded-[14px] border bg-surface-elevated pl-4 pr-12 text-[15px] text-ink',
            'placeholder:text-ink-faint transition-colors focus:outline-none focus:ring-2',
            error
              ? 'border-danger focus:border-danger focus:ring-danger/25'
              : 'border-line focus:border-primary focus:ring-primary/25',
          )}
        />
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openCalendar())}
          aria-label={open ? 'Close the calendar' : 'Pick a date from a calendar'}
          aria-expanded={open}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <CalendarDays className="size-[18px]" />
        </button>

        {open ? (
          <div className="absolute right-0 z-30 mt-2 w-[300px] rounded-card border border-line bg-surface-elevated p-3 shadow-[0_18px_44px_rgba(22,5,31,0.18)]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous month"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted"
              >
                <ChevronLeft className="size-4" />
              </button>

              {/* One control, inside the popover.
                  Month and year were native <select>s, and a browser renders
                  those as its own overlay — a tall OS-drawn list detached from
                  the calendar, floating over the page. Choosing a year now
                  swaps the grid for a list in the same panel, so there is only
                  ever one thing on screen. */}
              <button
                type="button"
                onClick={() => setPickingYear((picking) => !picking)}
                aria-expanded={pickingYear}
                className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted"
              >
                {MONTH_NAMES[month]} {year}
                {pickingYear ? (
                  <ChevronUp className="size-3.5 text-ink-soft" />
                ) : (
                  <ChevronDown className="size-3.5 text-ink-soft" />
                )}
              </button>

              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next month"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {pickingYear ? (
              <ul className="mt-2 grid max-h-[232px] grid-cols-4 gap-1 overflow-y-auto pr-1">
                {birthYears().map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => {
                        setYear(option);
                        setPickingYear(false);
                      }}
                      aria-pressed={option === year}
                      className={cn(
                        'w-full rounded-lg py-2 text-[13px] transition-colors',
                        option === year
                          ? 'bg-primary font-semibold text-on-primary'
                          : 'text-ink hover:bg-surface-muted',
                      )}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <>
            <div className="mt-2 grid grid-cols-7 gap-0.5">
              {WEEKDAY_INITIALS.map((initial, index) => (
                <span
                  key={`${initial}-${index}`}
                  aria-hidden
                  className="grid h-7 place-items-center text-[11px] font-semibold text-ink-faint"
                >
                  {initial}
                </span>
              ))}

              {cells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} className="h-9" />;
                const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const selected = selectedIso === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(toDisplayDate(year, month, day));
                      setOpen(false);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      'grid h-9 place-items-center rounded-lg text-[13px] transition-colors',
                      selected
                        ? 'bg-primary font-semibold text-on-primary'
                        : 'text-ink hover:bg-surface-muted',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}
