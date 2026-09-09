'use client';

import * as React from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * The street address field, with suggestions.
 *
 * A drop-in replacement for the `line1` Input, not an extra box above it. A
 * separate "search for an address" field asks people to type the address twice
 * - once to find it, once because the real field is still empty and they cannot
 * tell whether the first one counted. Here the field they were always going to
 * fill is the one that searches, and choosing a result fills the city, state
 * and ZIP alongside it.
 *
 * Typing is never blocked. A rural route, or a mailroom with a suite line
 * Mapbox has never heard of, is still just a text field, and every field stays
 * editable after a suggestion is applied.
 *
 * SETUP
 *   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....
 *
 * A `pk.` token is public by design and safe in the browser, but restrict it to
 * your domains in the Mapbox dashboard - an unrestricted one can be lifted from
 * the page and spent. Without the variable this stays a plain text input, so a
 * missing token costs the suggestions and nothing else.
 */

// Both spellings are read. MAPBOX_ACCESS_TOKEN is Mapbox's own convention and
// the one to prefer; MAPBOX_TOKEN is accepted so an existing deployment does
// not break on a rename.
//
// Each name is written out in full deliberately: Next inlines NEXT_PUBLIC_*
// values by matching the literal text `process.env.NEXT_PUBLIC_...` at build
// time, so a computed key would compile to undefined in the browser.
const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface AddressParts {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

interface Suggestion {
  id: string;
  parts: AddressParts;
  /** Full one-line address, for the secondary row of the option. */
  full: string;
}

/**
 * Our four fields out of a Geocoding v6 feature.
 *
 * Verified against a live response: the pieces sit under `properties.context`
 * as `address.address_number`, `address.street_name`, `place.name`,
 * `region.region_code` and `postcode.name`. Read defensively anyway - a rural
 * address legitimately has no street number, and anything missing is left blank
 * for the person to complete rather than guessed at.
 */
function toParts(feature: Record<string, unknown>): AddressParts | null {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const ctx = (props.context ?? {}) as Record<string, Record<string, unknown>>;
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

  const number = str(ctx.address?.address_number);
  const street = str(ctx.address?.street_name) || str(ctx.street?.name);
  const line1 = [number, street].filter(Boolean).join(' ') || str(props.name);

  const city = str(ctx.place?.name) || str(ctx.locality?.name);
  const state = (str(ctx.region?.region_code) || str(ctx.region?.short_code)).replace(/^US-/, '');
  const zip = str(ctx.postcode?.name);

  if (!line1 && !city && !zip) return null;
  return { line1, city, state: state.toUpperCase(), zip };
}

export interface AddressFieldProps {
  id?: string;
  value: string;
  /** Every keystroke, so this behaves like the plain input it replaces. */
  onChange: (line1: string) => void;
  /** A suggestion was chosen - fill city, state and ZIP from this. */
  onSelect: (parts: AddressParts) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AddressField({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  className,
}: AddressFieldProps) {
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [active, setActive] = React.useState(0);
  // Set while a suggestion is being applied, so the resulting value change does
  // not immediately search again and reopen the list under the cursor.
  const justPicked = React.useRef(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  // Stable id so the input can point `aria-controls` at its own listbox; a
  // combobox without it leaves screen readers unable to follow the suggestions.
  const listId = React.useId();

  const enabled = MAPBOX_TOKEN.length > 0;

  React.useEffect(() => {
    if (!enabled) return;
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 4) return;

    // Debounced, and the previous request is abandoned rather than raced - out
    // of order responses would otherwise show suggestions for a stale query.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const url =
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}` +
          `&country=us&types=address&limit=6&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { features?: Record<string, unknown>[] };
        const next: Suggestion[] = [];
        for (const [i, f] of (body.features ?? []).entries()) {
          const parts = toParts(f);
          if (!parts) continue;
          const props = (f.properties ?? {}) as Record<string, unknown>;
          next.push({
            id: String(props.mapbox_id ?? i),
            parts,
            full: typeof props.full_address === 'string' ? props.full_address : '',
          });
        }
        setItems(next);
        setActive(0);
        setOpen(next.length > 0);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // A lookup outage must never stop anyone saving an address; it only
        // costs the suggestions.
        setFailed(true);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, enabled]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (s: Suggestion) => {
    justPicked.current = true;
    onSelect(s.parts);
    setItems([]);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      // Only swallowed while the list is open, so Enter still submits the form
      // the rest of the time.
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <div className="hl-control hl-control-focus flex items-center gap-2 px-3 py-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && items.length > 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-60"
        />
        {loading ? <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-text-muted" /> : null}
      </div>

      {failed ? (
        <p className="mt-1 text-[12px] text-text-muted">
          Address lookup is unavailable — type the address and the fields below.
        </p>
      ) : null}

      {open && items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-[14px] border border-border bg-background p-1 shadow-card"
        >
          {items.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm text-text',
                  i === active && 'bg-primary-tint',
                )}
              >
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-text-muted" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.parts.line1}</span>
                  <span className="block truncate text-[12px] text-text-muted">
                    {s.full || [s.parts.city, s.parts.state, s.parts.zip].filter(Boolean).join(', ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
