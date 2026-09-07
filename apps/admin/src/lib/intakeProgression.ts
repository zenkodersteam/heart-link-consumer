import type { ApplicationStatus } from '@heartlink/api-contract';

export interface ManualStatusAdvance {
  targetStatus: ApplicationStatus;
  label: string;
  successMessage: string;
}

const MANUAL_STATUS_ADVANCE: Partial<Record<ApplicationStatus, ManualStatusAdvance>> = {
  packet_requested: {
    targetStatus: 'packet_generated',
    label: 'Generate Packet',
    successMessage: 'Application moved to Packet Generated',
  },
  packet_generated: {
    targetStatus: 'packet_sent',
    label: 'Mark Packet Sent',
    successMessage: 'Application moved to Packet Sent',
  },
  packet_sent: {
    targetStatus: 'waiting_for_return',
    label: 'Await Return',
    successMessage: 'Application moved to Awaiting Return',
  },
  waiting_for_return: {
    targetStatus: 'returned',
    label: 'Mark Packet Returned',
    successMessage: 'Application moved to Returned',
  },
};

export function getManualStatusAdvance(
  status: ApplicationStatus,
): ManualStatusAdvance | null {
  return MANUAL_STATUS_ADVANCE[status] ?? null;
}

export function canUploadReturnedScan(status: ApplicationStatus): boolean {
  return status === 'returned';
}
