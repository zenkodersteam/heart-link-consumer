'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { isBuilt } from '@/lib/routes';
import { cn } from '@/lib/utils';

/**
 * One line in a settings card.
 *
 * A row whose destination has not been ported yet renders as "Coming soon" and
 * is not clickable, rather than linking at a page that would 404 — see
 * BUILT_ROUTES in lib/routes.
 */
export function SettingsRow({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  danger,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const pending = href !== undefined && !isBuilt(href);

  const body = (
    <>
      <Icon
        className={cn('size-[18px] shrink-0', danger ? 'text-danger' : 'text-ink-faint')}
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-left text-[14.5px]',
          danger ? 'font-semibold text-danger' : 'text-ink',
        )}
      >
        {label}
      </span>
      {pending ? (
        <span className="shrink-0 rounded-[--radius-pill] bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
          Coming soon
        </span>
      ) : value ? (
        <span className="shrink-0 text-[13px] text-ink-soft">{value}</span>
      ) : null}
      {!pending && (href || onClick) ? (
        <ChevronRight className="size-4 shrink-0 text-ink-faint" />
      ) : null}
    </>
  );

  const className = cn(
    'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors',
    !last && 'border-b border-line',
    pending ? 'cursor-default opacity-70' : 'hover:bg-surface-muted',
  );

  if (pending) return <div className={className}>{body}</div>;
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-surface-elevated shadow-[0_1px_2px_rgba(46,18,64,0.05),0_8px_18px_rgba(46,18,64,0.06)]">
      {children}
    </div>
  );
}

export function SettingsGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-7 px-1 text-[11px] font-semibold uppercase tracking-[0.8px] text-ink-faint">
      {children}
    </h2>
  );
}
