'use client';

import { useSyncExternalStore } from 'react';

/**
 * A timestamp in the viewer's own timezone.
 *
 * Most of the console is server-rendered, and a server formats dates in its
 * own zone — which on Vercel is UTC. So every timeline, document row and log
 * read five hours out for staff in Pakistan, with nothing on screen saying
 * which zone was meant.
 *
 * The server still has to send something, and it cannot know where the viewer
 * is. It sends the time in UTC, labelled as such; the browser then swaps in
 * the local reading on the first client render. `useSyncExternalStore` is what
 * makes that swap legal: its server snapshot is used for hydration on both
 * sides — so the two agree and nothing mismatches — and the client snapshot
 * takes over immediately after.
 */

type TimeStyle = 'timeline' | 'full' | 'date';

const OPTIONS: Record<TimeStyle, Intl.DateTimeFormatOptions> = {
  // "Sep 10, 5:11 PM"
  timeline: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  // "Sep 10, 2026, 5:11 PM"
  full: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
  // "Sep 10, 2026"
  date: { month: 'short', day: 'numeric', year: 'numeric' },
};

// Nothing to subscribe to: the zone does not change while a page is open.
const subscribe = () => () => undefined;

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function LocalTime({
  value,
  style = 'timeline',
  fallback = '-',
  className,
}: {
  value: string | Date | null | undefined;
  style?: TimeStyle;
  fallback?: string;
  className?: string;
}) {
  const date = parse(value);

  const text = useSyncExternalStore(
    subscribe,
    // Browser: whatever zone the viewer's machine is set to.
    () => (date ? new Intl.DateTimeFormat('en-US', OPTIONS[style]).format(date) : fallback),
    // Server, and hydration on both sides: UTC, said out loud. A bare time with
    // no zone is the ambiguity this component exists to remove.
    () =>
      date
        ? `${new Intl.DateTimeFormat('en-US', { ...OPTIONS[style], timeZone: 'UTC' }).format(date)}${
            style === 'date' ? '' : ' UTC'
          }`
        : fallback,
  );

  if (!date) return <span className={className}>{fallback}</span>;

  return (
    <time dateTime={date.toISOString()} title={date.toISOString()} className={className}>
      {text}
    </time>
  );
}
