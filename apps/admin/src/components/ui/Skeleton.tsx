import { cn } from '../../lib/utils';

/** A single pulsing placeholder block (Tailwind animate-pulse). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface', className)} />;
}

/** Generic list/table loading state for list routes (intake, profiles, payments, facilities). */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-6">
      <Skeleton className="mb-4 h-7 w-48" />
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex gap-4 border-b border-border bg-surface px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 border-b border-border px-4 py-3.5">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dashboard loading state - stat cards + an activity list. */
export function CardsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="mt-2 h-6 w-40" />
      <div className="space-y-3 rounded-lg border border-border bg-background p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

/**
 * Detail routes: a header, a wide main column and a narrower side column.
 *
 * Shaped like the page it stands in for rather than a generic spinner, so the
 * layout does not jump when the real content lands — the placeholder occupies
 * roughly the space the content will.
 */
export function DetailSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="space-y-4 rounded-lg border border-border bg-background p-6">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
            <Skeleton className="h-24" />
          </div>
          <div className="space-y-3 rounded-lg border border-border bg-background p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-56" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border bg-background p-5">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 3 }).map((__, j) => (
                <Skeleton key={j} className="h-14" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Routes that are one form: a heading and a column of fields. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-7 w-52" />
      <div className="max-w-2xl space-y-4 rounded-lg border border-border bg-background p-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-10" />
          </div>
        ))}
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

/** A grid of images, for the photo review queue. */
export function GallerySkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border bg-background p-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
