import * as React from 'react';
import { cn } from '../../lib/utils';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  className,
  compact = false,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-background px-6 py-5 shadow-soft',
        compact ? 'px-5 py-4' : 'px-6 py-5 md:px-7 md:py-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-gold/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-28 w-28 rounded-full bg-accent-gold/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-gold">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-serif text-[28px] leading-[1.1] text-text md:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="relative flex shrink-0 flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
