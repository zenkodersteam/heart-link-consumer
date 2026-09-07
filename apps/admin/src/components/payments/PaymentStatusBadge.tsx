import type { PaymentStatus } from '@heartlink/api-contract';
import {
  StatusBadge as BaseStatusBadge,
  type StatusBadgeVariant,
} from '../ui/StatusBadge';

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, StatusBadgeVariant> = {
  received: 'info',
  matched: 'success',
  confirmed: 'success',
  unmatched: 'warning',
  exception: 'danger',
  refunded: 'neutral',
};

export function PaymentStatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: PaymentStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <BaseStatusBadge
      status={status}
      variantMap={PAYMENT_STATUS_VARIANT}
      size={size}
      label={status[0].toUpperCase() + status.slice(1)}
      className={className}
    />
  );
}
