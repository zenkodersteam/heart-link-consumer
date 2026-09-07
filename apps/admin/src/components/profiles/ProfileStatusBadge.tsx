import type { ProfileStatus } from '@heartlink/api-contract';
import {
  StatusBadge as BaseStatusBadge,
  type StatusBadgeVariant,
} from '../ui/StatusBadge';
import { PROFILE_STATUS_LABEL } from '../../lib/adminLabels';

const PROFILE_STATUS_VARIANT: Record<ProfileStatus, StatusBadgeVariant> = {
  draft: 'neutral',
  pending_approval: 'warning',
  pending_payment: 'info',
  active: 'success',
  paused: 'danger',
  expired: 'neutral',
  removed: 'danger',
};

export function ProfileStatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: ProfileStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <BaseStatusBadge
      status={status}
      variantMap={PROFILE_STATUS_VARIANT}
      size={size}
      label={PROFILE_STATUS_LABEL[status]}
      className={className}
    />
  );
}
