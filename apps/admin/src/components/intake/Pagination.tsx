'use client';

import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Pagination({
  total,
  limit,
  offset,
}: {
  total: number;
  limit: number;
  offset: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  if (total === 0) return null;

  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  const go = (page: number) => {
    const next = new URLSearchParams(params.toString());
    const newOffset = Math.max(0, (page - 1) * limit);
    if (newOffset > 0) next.set('offset', String(newOffset));
    else next.delete('offset');
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const pages = buildPageList(currentPage, totalPages);

  return (
    <div className="flex w-full items-center gap-4 text-[13px] leading-[18px] text-text-muted">
      <span>
        Showing {from}-{to} of {total}
      </span>
      <div className="flex-1" />
      <PageButton
        disabled={currentPage <= 1}
        onClick={() => go(currentPage - 1)}
        label={<ChevronLeft className="size-4" />}
      />
      {pages.map((p, i) =>
        p === '…' ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-[13px] text-text"
          >
            …
          </span>
        ) : (
          <PageButton
            key={p}
            active={p === currentPage}
            onClick={() => go(p)}
            label={String(p)}
          />
        ),
      )}
      <PageButton
        disabled={currentPage >= totalPages}
        onClick={() => go(currentPage + 1)}
        label={<ChevronRight className="size-4" />}
      />
    </div>
  );
}

function PageButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-sm border border-border text-[13px] leading-[18px] transition-all active:scale-95 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'bg-surface font-medium text-text' : 'bg-background text-text',
        disabled ? 'opacity-40' : 'hover:bg-surface',
      )}
    >
      {label}
    </button>
  );
}

function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const first = 1;
  const last = total;
  const around = [current - 1, current, current + 1].filter((p) => p > 1 && p < last);
  const list: Array<number | '…'> = [first];
  if (around[0] !== undefined && around[0] > 2) list.push('…');
  list.push(...around);
  if (around[around.length - 1] !== undefined && around[around.length - 1] < last - 1)
    list.push('…');
  list.push(last);
  return list;
}
