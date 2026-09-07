import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type StatusBadgeVariant =
  | 'warning'
  | 'info'
  | 'success'
  | 'neutral'
  | 'danger';

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  warning: 'bg-warning-tint text-warning',
  info: 'bg-info-tint text-info',
  success: 'bg-success-tint text-success',
  neutral: 'bg-neutral-tint text-neutral',
  danger: 'bg-danger-tint text-danger',
};

/**
 * Generic status pill - pass any string status + a variant map. Used as the
 * shared primitive behind {Intake, Profile, Payment, Photo}StatusBadge.
 */
export function StatusBadge<T extends string>({
  status,
  variantMap,
  label,
  size = 'sm',
  className,
}: {
  status: T;
  variantMap: Record<T, StatusBadgeVariant>;
  /** Override the displayed text. Defaults to the status string itself. */
  label?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const variant = variantMap[status] ?? 'neutral';
  const sizing =
    size === 'md'
      ? 'px-2.5 py-1 text-xs rounded-pill-lg leading-4'
      : 'px-2 py-0.5 text-[11px] rounded-pill leading-[14px]';
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        VARIANT_CLASSES[variant],
        sizing,
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
