'use client';

import Link from 'next/link';
import { ArrowUpRight, CreditCard, Inbox, Shield, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { getInitialStatDisplay } from '../../lib/dashboardStats';
import type { SignalTone } from '../../lib/dashboardAttention';

export type StatTone = SignalTone;

// ponytail: icon components can't cross the server->client prop boundary, so
// pass a name and resolve it here.
const ICONS = { inbox: Inbox, users: Users, 'credit-card': CreditCard, shield: Shield } as const;
export type StatIcon = keyof typeof ICONS;

/**
 * Tone table. Only the two blocking tones get a severity rail and a colored
 * number; everything else stays quiet so the loud tiles actually mean
 * something when they appear.
 */
const TONE: Record<
  StatTone,
  { card: string; rail: string | null; icon: string; value: string; dot: string; caption: string }
> = {
  critical: {
    card: 'border-danger/35 bg-danger/[0.035] hover:border-danger/55',
    rail: 'bg-danger',
    icon: 'bg-danger/12 text-danger',
    value: 'text-danger',
    dot: 'bg-danger',
    caption: 'text-danger',
  },
  blocked: {
    card: 'border-danger/25 hover:border-danger/45',
    rail: 'bg-danger/70',
    icon: 'bg-danger/10 text-danger',
    value: 'text-danger',
    dot: 'bg-danger',
    caption: 'text-danger',
  },
  watch: {
    card: 'border-border hover:border-warning/50',
    rail: null,
    icon: 'bg-warning/10 text-warning',
    value: 'text-text',
    dot: 'bg-warning',
    caption: 'text-warning',
  },
  neutral: {
    card: 'border-border hover:border-primary/40',
    rail: null,
    icon: 'bg-primary/10 text-primary',
    value: 'text-text',
    dot: 'bg-text-subtle',
    caption: 'text-text-muted',
  },
  healthy: {
    card: 'border-border hover:border-success/45',
    rail: null,
    icon: 'bg-success/10 text-success',
    value: 'text-text',
    dot: 'bg-success',
    caption: 'text-success',
  },
  unavailable: {
    card: 'border-dashed border-border-strong hover:border-text-subtle',
    rail: null,
    icon: 'bg-neutral-tint text-text-subtle',
    value: 'text-text-subtle',
    dot: 'bg-text-subtle',
    caption: 'text-text-muted',
  },
};

interface StatCardProps {
  value: number | null;
  /** Short queue name, e.g. "Intake review". */
  label: string;
  /** Status line under the number, e.g. "Blocking activation". */
  caption: string;
  tone: StatTone;
  href: string;
  index?: number;
  icon?: StatIcon;
}

/**
 * Operational signal tile. Click-through to the queue it reports on, a status
 * line that says what the number means for the operator, and a count-up on the
 * number (skipped under reduced-motion).
 */
export function StatCard({
  value,
  label,
  caption,
  tone,
  href,
  index = 0,
  icon,
}: StatCardProps) {
  const Icon = icon ? ICONS[icon] : null;
  const styles = TONE[tone];
  const [display, setDisplay] = useState<number | null>(getInitialStatDisplay(value));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      // Sync display to a null value; count-up animation requires an effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(null);
      return;
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(eased * value));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <Link
      href={href}
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        'group animate-fade-up relative block overflow-hidden rounded-lg border bg-background p-4 transition-all duration-200 sm:p-5',
        'hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        styles.card,
      )}
    >
      {styles.rail ? (
        <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', styles.rail)} />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.14em] text-text-muted">
          {label}
        </span>
        {Icon ? (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100',
              styles.icon,
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            'font-serif text-[30px] leading-9 tabular-nums sm:text-[34px] sm:leading-10',
            styles.value,
          )}
        >
          {display === null ? '-' : display}
        </span>
        <ArrowUpRight className="size-4 shrink-0 self-center text-text-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none" />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', styles.dot)} />
        <span className={cn('text-[12px] font-medium leading-4', styles.caption)}>
          {caption}
        </span>
      </div>
    </Link>
  );
}
