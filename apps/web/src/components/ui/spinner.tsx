import { cn } from '@/lib/utils';

/**
 * Brand spinner. `aria-label` rather than a visually hidden span so screen
 * readers announce it without adding a stray text node to the layout.
 */
export function Spinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimension = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-9 border-[3px]' }[size];
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-primary/25 border-t-primary',
        dimension,
        className,
      )}
    />
  );
}

/** Full-height centred spinner, for route-level `loading.tsx` files. */
export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
