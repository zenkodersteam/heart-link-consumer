export const APPLICATION_STATUSES = [
  'packet_requested',
  'packet_generated',
  'packet_sent',
  'waiting_for_return',
  'returned',
  'scanned',
  'ocr_processed',
  'needs_review',
  'incomplete',
  'verified',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  packet_requested: ['packet_generated'],
  packet_generated: ['packet_sent'],
  packet_sent: ['waiting_for_return'],
  waiting_for_return: ['returned'],
  returned: ['scanned'],
  scanned: ['ocr_processed'],
  ocr_processed: ['needs_review', 'verified'],
  needs_review: ['verified', 'incomplete', 'rejected'],
  incomplete: ['returned'],
  verified: [],
  rejected: [],
};

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}
