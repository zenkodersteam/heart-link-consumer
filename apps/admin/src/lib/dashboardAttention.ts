import type { NavCounts } from '@heartlink/api-contract';

/**
 * Severity model behind the dashboard command board ("Needs attention") and the
 * signal tiles above it. Deliberately React-free so ordering, severity, and
 * operator copy are unit-testable without rendering.
 *
 * Severity ladder, highest urgency first:
 *   unknown  - the live signal itself failed; the board cannot be trusted
 *   critical - member safety or a blocked activation path
 *   elevated - verification backlog that will block activation if left
 *   steady   - normal queue work, no blockage yet
 *   clear    - nothing waiting on staff
 */

export type AttentionSeverity =
  | 'unknown'
  | 'critical'
  | 'elevated'
  | 'steady'
  | 'clear';

export type AttentionKind =
  | 'signal'
  | 'safety'
  | 'payment'
  | 'verification'
  | 'activation'
  | 'clear';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: AttentionSeverity;
  /** Queue size behind the row. Null when the count could not be read. */
  count: number | null;
  title: string;
  detail: string;
  /** Micro label naming the operational consequence, e.g. "Activation blocked". */
  impact: string;
  cta: string;
  href: string;
}

export interface AttentionSummary {
  severity: AttentionSeverity;
  /** One line under the greeting, written for the operator on shift. */
  headline: string;
  /** Rows that represent real work (excludes the clear/unknown placeholders). */
  openCount: number;
  /** Rows at critical severity: safety flags and blocked activations. */
  criticalCount: number;
}

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  unknown: 0,
  critical: 1,
  elevated: 2,
  steady: 3,
  clear: 4,
};

// Tie-break inside a severity band: safety outranks money, money outranks
// verification, verification outranks activation housekeeping.
const KIND_RANK: Record<AttentionKind, number> = {
  signal: 0,
  safety: 1,
  payment: 2,
  verification: 3,
  activation: 4,
  clear: 5,
};

export function compareAttentionItems(a: AttentionItem, b: AttentionItem): number {
  const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (bySeverity !== 0) return bySeverity;
  const byKind = KIND_RANK[a.kind] - KIND_RANK[b.kind];
  if (byKind !== 0) return byKind;
  return (b.count ?? 0) - (a.count ?? 0);
}

function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

/**
 * Builds the ordered command-board rows. A null `counts` is itself an
 * operational condition (the live signal is down), not an empty board.
 */
export function buildAttentionItems(counts: NavCounts | null): AttentionItem[] {
  if (!counts) {
    return [
      {
        id: 'signal-unavailable',
        kind: 'signal',
        severity: 'unknown',
        count: null,
        title: 'Live queue counts are unavailable',
        detail:
          'The dashboard could not reach the operations API, so nothing on this board is confirmed. Work from the queue pages directly until counts return.',
        impact: 'Production risk',
        cta: 'Open intake queue',
        href: '/intake',
      },
    ];
  }

  const items: AttentionItem[] = [];

  if (counts.moderation > 0) {
    items.push({
      id: 'moderation',
      kind: 'safety',
      severity: 'critical',
      count: counts.moderation,
      title: `${counts.moderation} safety ${plural(counts.moderation, 'flag')} open`,
      detail:
        'Member reports are waiting on a decision. Clear these before any other queue on the board.',
      impact: 'Member safety',
      cta: 'Review flags',
      href: '/moderation',
    });
  }

  if (counts.payments > 0) {
    items.push({
      id: 'payments',
      kind: 'payment',
      severity: 'critical',
      count: counts.payments,
      title: `${counts.payments} ${plural(counts.payments, 'payment')} unmatched or in exception`,
      detail:
        'Mailed payments are not tied to an application yet, so those members cannot be activated.',
      impact: 'Activation blocked',
      cta: 'Match payments',
      href: '/payments?tab=unmatched',
    });
  }

  if (counts.intake > 0) {
    items.push({
      id: 'intake',
      kind: 'verification',
      severity: 'elevated',
      count: counts.intake,
      title: `${counts.intake} ${plural(counts.intake, 'application')} waiting on review`,
      detail:
        'Low-confidence OCR fields and incomplete packets need an operator decision before they can move.',
      impact: 'OCR review',
      cta: 'Open review queue',
      href: '/intake/review',
    });
  }

  if (counts.profiles > 0) {
    items.push({
      id: 'profiles',
      kind: 'activation',
      severity: 'steady',
      count: counts.profiles,
      title: `${counts.profiles} ${plural(counts.profiles, 'profile')} pending activation`,
      detail:
        'Drafts and pending profiles are holding at a checklist gate before they can go live.',
      impact: 'Activation pending',
      cta: 'Review profiles',
      href: '/profiles',
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'clear',
      kind: 'clear',
      severity: 'clear',
      count: 0,
      title: 'All queues are clear',
      detail:
        'Nothing is waiting on staff right now. Spot-check photo review to stay ahead of the next batch.',
      impact: 'Nothing blocked',
      cta: 'Photo review',
      href: '/profiles/photo-review',
    });
  }

  return items.sort(compareAttentionItems);
}

/** True for rows that represent real work rather than a board state. */
export function isOpenWork(item: AttentionItem): boolean {
  return item.kind !== 'clear' && item.kind !== 'signal';
}

export function summarizeAttention(items: AttentionItem[]): AttentionSummary {
  const open = items.filter(isOpenWork);
  const criticalCount = open.filter((item) => item.severity === 'critical').length;
  const openCount = open.length;

  if (items.some((item) => item.kind === 'signal')) {
    return {
      severity: 'unknown',
      headline:
        'Live queue counts are unavailable. Treat this board as unverified and work from the queue pages.',
      openCount: 0,
      criticalCount: 0,
    };
  }

  if (openCount === 0) {
    return {
      severity: 'clear',
      headline: 'All queues are clear. Nothing is waiting on staff right now.',
      openCount: 0,
      criticalCount: 0,
    };
  }

  const rest = openCount - criticalCount;
  if (criticalCount > 0) {
    const lead = `${criticalCount} blocking ${plural(criticalCount, 'item')} to clear first`;
    return {
      severity: 'critical',
      headline:
        rest > 0
          ? `${lead}, then ${rest} more ${plural(rest, 'queue')} to work today.`
          : `${lead}. Nothing else is waiting on staff.`,
      openCount,
      criticalCount,
    };
  }

  return {
    severity: open[0]?.severity ?? 'steady',
    headline: `${openCount} ${plural(openCount, 'queue')} ${plural(openCount, 'needs', 'need')} staff today. Nothing is blocking activation.`,
    openCount,
    criticalCount,
  };
}

/** Tone for the tile above a queue, given its live count. */
export type SignalTone =
  | 'unavailable'
  | 'critical'
  | 'blocked'
  | 'watch'
  | 'healthy'
  | 'neutral';

export interface SignalDescriptor {
  tone: SignalTone;
  /** Short status line under the number, e.g. "Blocking activation". */
  caption: string;
}

/**
 * Maps a queue's count to a tile tone plus its status caption. Only safety and
 * payments can reach the loud tones; the rest stay quiet so the board keeps a
 * readable hierarchy instead of shouting on every tile.
 */
export function describeSignal(
  kind: 'intake' | 'profiles' | 'payments' | 'moderation',
  value: number | null,
): SignalDescriptor {
  if (value === null) return { tone: 'unavailable', caption: 'Signal unavailable' };

  switch (kind) {
    case 'moderation':
      return value > 0
        ? { tone: 'critical', caption: 'Member safety, review now' }
        : { tone: 'healthy', caption: 'No open reports' };
    case 'payments':
      return value > 0
        ? { tone: 'blocked', caption: 'Blocking activation' }
        : { tone: 'healthy', caption: 'All payments matched' };
    case 'intake':
      return value > 0
        ? { tone: 'watch', caption: 'Verification backlog' }
        : { tone: 'healthy', caption: 'Review queue empty' };
    case 'profiles':
    default:
      return value > 0
        ? { tone: 'neutral', caption: 'Awaiting checklist gates' }
        : { tone: 'healthy', caption: 'Nothing pending' };
  }
}
