import type { ApplicationStatus } from '@heartlink/api-contract';
import {
  StatusBadge as BaseStatusBadge,
  type StatusBadgeVariant,
} from '../ui/StatusBadge';
import { APPLICATION_STATUS_LABEL } from '../../lib/adminLabels';

const APPLICATION_STATUS_VARIANT: Record<ApplicationStatus, StatusBadgeVariant> = {
  packet_requested: 'neutral',
  packet_generated: 'neutral',
  packet_sent: 'info',
  waiting_for_return: 'info',
  returned: 'info',
  scanned: 'neutral',
  ocr_processed: 'info',
  needs_review: 'warning',
  incomplete: 'warning',
  verified: 'success',
  rejected: 'danger',
};

export function StatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <BaseStatusBadge
      status={status}
      variantMap={APPLICATION_STATUS_VARIANT}
      size={size}
      label={APPLICATION_STATUS_LABEL[status]}
      className={className}
    />
  );
}
