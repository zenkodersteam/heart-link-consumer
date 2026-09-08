import type { LetterEntitlement, MailboxThreadSummary } from '@heartlink/consumer-api';

/**
 * Which half of the mailbox is on screen.
 *
 * Two, not the four the client screens draw: Inbox and Sent are real — a
 * thread's last direction decides which it belongs to — while Archive and
 * Trash have nothing behind them in the API.
 */
export type MailFolder = 'inbox' | 'sent';

/**
 * Delivery states, in the member's words.
 *
 * A letter waits for staff review before it is ever printed, so the first
 * state a member sees is "Awaiting review" rather than "Sent" — claiming it
 * had been posted would not be true yet.
 */
const DELIVERY_LABELS: Record<string, string> = {
  awaiting_approval: 'Awaiting review',
  rejected: 'Not approved',
  queued: 'Queued',
  submitted: 'Sent to print',
  printing: 'Printing',
  in_transit: 'In transit',
  delivered: 'Delivered',
  returned: 'Returned',
  failed: 'Failed',
};

export function deliveryLabel(status: string | null): string {
  if (!status) return '';
  return DELIVERY_LABELS[status] ?? status;
}

/** Today shows a time, anything older shows a date — the way mail apps do. */
export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Counted the way the server counts, so the two never disagree on the limit. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function lettersLeftText(entitlement: LetterEntitlement | undefined): string {
  if (!entitlement) return '';
  const total = entitlement.totalRemaining;
  if (total === null) return 'Unlimited letters';
  return `${total} letter${total === 1 ? '' : 's'} left`;
}

/**
 * What a top-up pack is shown as. The server is authoritative on price and
 * credits; this is only what the member reads before being sent to checkout.
 */
export const LETTER_PACKS: {
  key: 'small' | 'medium' | 'large';
  letters: number;
  price: string;
}[] = [
  { key: 'small', letters: 3, price: '$4.99' },
  { key: 'medium', letters: 7, price: '$9.99' },
  { key: 'large', letters: 20, price: '$19.99' },
];

/**
 * The line under a name in the thread list.
 *
 * An inbound letter is scanned paper, so it carries no typed text to quote —
 * and "No letters yet" printed over a reply that has actually arrived reads as
 * the app having lost it.
 */
export function threadPreview(thread: MailboxThreadSummary): string {
  if (thread.lastMessagePreview) return thread.lastMessagePreview;
  if (thread.lastDirection === 'inbound') return 'Scanned reply · open to read';
  return 'No letters yet';
}
