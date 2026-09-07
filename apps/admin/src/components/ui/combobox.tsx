'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * A select you can type into.
 *
 * The lookups this replaces were a search box sitting *above* a dropdown: you
 * typed into one control to change the contents of another, with no visible
 * link between them. That reads as two fields, so staff filled in the search
 * box and submitted without ever opening the list, and the box stayed on screen
 * afterwards showing a query that no longer described the choice made.
 *
 * Here the search lives inside the popover, which is what a combobox is: one
 * control, showing the chosen row when closed and a filter when open.
 *
 * Radix Select cannot host a text field - it owns the keyboard for its own
 * type-ahead - so this is Popover plus a listbox, with the roving focus and
 * ARIA wiring done here. Selection state, form submission and the trigger's
 * look are deliberately identical to `Select`, so the two read as one family.
 */

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line, e.g. an email or id, searched along with the label. */
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** Trigger text while nothing is chosen. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when the list is empty; defaults to a generic line. */
  emptyMessage?: string;
  /**
   * Notified as the query changes, for lookups the server has to answer.
   * When set, filtering is assumed to be the caller's job and the options are
   * rendered as given.
   */
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches.',
  onSearchChange,
  loading,
  id,
  name,
  required,
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // With `onSearchChange` the caller is doing the filtering (usually on the
  // server, where the rows that match may not be on this page at all), so the
  // options arrive already narrowed and filtering again here would only hide
  // correct results.
  const visible = React.useMemo(() => {
    if (onSearchChange) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q));
  }, [options, query, onSearchChange]);

  // Keep the highlight on a row that exists: the list changes under it as the
  // query narrows, and an index past the end makes Enter do nothing. Clamped on
  // read rather than synced in an effect, which would re-render a second time
  // for every keystroke just to correct itself.
  const activeIndex = active < visible.length ? active : 0;

  const commit = (option: ComboboxOption) => {
    if (option.disabled) return;
    onValueChange?.(option.value);
    setOpen(false);
    setQuery('');
    onSearchChange?.('');
  };

  const move = (delta: number) => {
    setActive(() => {
      if (visible.length === 0) return 0;
      const next = (activeIndex + delta + visible.length) % visible.length;
      listRef.current?.querySelectorAll('[role="option"]')[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      // The popover is portalled outside the form, so Enter would not submit
      // it anyway - but stop it explicitly so the intent is clear.
      e.preventDefault();
      const option = visible[activeIndex];
      if (option) commit(option);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(visible.length - 1, 0));
    }
  };

  return (
    <>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery('');
            onSearchChange?.('');
          }
        }}
      >
        <PopoverPrimitive.Trigger
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'hl-control group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
            'min-h-[38px] focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'data-[state=open]:border-primary/35',
            className,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-text-muted')}>
            {selected ? selected.label : placeholder}
          </span>
          {selected ? (
            // A cleared lookup is a real state - the letter turned out to be for
            // someone else - and re-picking from a long list to undo a mistake
            // is worse than one button.
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onValueChange?.('');
              }}
              className="shrink-0 rounded-full p-0.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
          <ChevronDown className="size-4 shrink-0 text-text-muted transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            onOpenAutoFocus={(e) => {
              // Focus the query field rather than the first row, so the popover
              // opens ready to type.
              e.preventDefault();
              (e.currentTarget as HTMLElement)
                .querySelector<HTMLInputElement>('input[type="search"]')
                ?.focus();
            }}
            className={cn(
              'hl-popover z-[70] overflow-hidden rounded-[14px] border border-border bg-background shadow-card',
              'w-[var(--radix-popover-trigger-width)]',
            )}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search aria-hidden className="size-4 shrink-0 text-text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:appearance-none"
              />
              {loading ? <Loader2 aria-hidden className="size-4 animate-spin text-text-muted" /> : null}
            </div>

            <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
              {visible.length === 0 ? (
                <p className="px-2.5 py-6 text-center text-sm text-text-muted">
                  {loading ? 'Searching…' : emptyMessage}
                </p>
              ) : (
                visible.map((option, i) => {
                  const isSelected = option.value === value;
                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(option)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-text',
                        i === activeIndex && 'bg-primary-tint',
                        option.disabled && 'pointer-events-none opacity-50',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate', isSelected && 'font-medium')}>
                          {option.label}
                        </span>
                        {option.hint ? (
                          <span className="block truncate text-[12px] text-text-muted">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    </div>
                  );
                })
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {name ? (
        // Mirrors `Select`: a clipped native control so `required` still blocks
        // submission and FormData carries the value. Clipped rather than
        // `display: none`, which makes a required field unfocusable and has the
        // browser refuse to submit with no visible cause.
        <select
          name={name}
          required={required}
          disabled={disabled}
          value={value ?? ''}
          onChange={() => {}}
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            border: 0,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
          }}
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </select>
      ) : null}
    </>
  );
}
