import type { OutsideProfileStatus } from '@heartlink/api-contract';
import { StatusBadge, type StatusBadgeVariant } from '../ui/StatusBadge';

/**
 * How far a member has got with their own profile.
 *
 * `null` is its own state rather than an absence: someone who has signed up and
 * never started is the person a support question is most often about, and a
 * blank cell reads as missing data rather than as an answer.
 */
const VARIANTS: Record<OutsideProfileStatus | 'none', StatusBadgeVariant> = {
  none: 'neutral',
  draft: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const LABELS: Record<OutsideProfileStatus | 'none', string> = {
  none: 'Not started',
  draft: 'Draft',
  pending: 'In review',
  approved: 'Approved',
  rejected: 'Needs changes',
};

export function UserStatusBadge({
  status,
  size = 'sm',
}: {
  status: OutsideProfileStatus | null;
  size?: 'sm' | 'md';
}) {
  const key = status ?? 'none';
  return <StatusBadge status={key} variantMap={VARIANTS} label={LABELS[key]} size={size} />;
}
