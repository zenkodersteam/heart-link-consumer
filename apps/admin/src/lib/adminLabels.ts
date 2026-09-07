import type { ApplicationStatus, ProfileStatus } from '@heartlink/api-contract';

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  packet_requested: 'Packet Requested',
  packet_generated: 'Packet Generated',
  packet_sent: 'Packet Sent',
  waiting_for_return: 'Awaiting Return',
  returned: 'Returned',
  scanned: 'Scanned',
  ocr_processed: 'Processed',
  needs_review: 'Needs Review',
  incomplete: 'Incomplete',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const PROFILE_STATUS_LABEL: Record<ProfileStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  pending_payment: 'Pending Payment',
  active: 'Active',
  paused: 'Paused',
  expired: 'Expired',
  removed: 'Removed',
};