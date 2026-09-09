import { StatusBadge, type StatusBadgeVariant } from './StatusBadge';

/**
 * A pill for a status whose value set is not known at compile time.
 *
 * Some payloads type `status` as a bare `string` — match suggestions draw
 * theirs from applications, profiles or subscriptions depending on what was
 * matched — so there is no map to key on. The tone is read from the word
 * itself and falls back to neutral, which is the safe end: an unrecognised
 * status looks unremarkable rather than borrowing a colour that would state
 * something untrue about it.
 *
 * Prefer a typed badge with an explicit map wherever the values are known.
 */
const TONES: Array<[RegExp, StatusBadgeVariant]> = [
  [/^(verified|approved|active|confirmed|complete|completed|delivered|sent|paid)$/, 'success'],
  [/^(rejected|failed|cancelled|canceled|blocked|expired|exception)$/, 'danger'],
  [/(pending|review|incomplete|waiting|held|unmatched|draft)/, 'warning'],
  [/(processing|queued|scanned|generated|requested|matched|received|returned)/, 'info'],
];

function toneFor(status: string): StatusBadgeVariant {
  const key = status.trim().toLowerCase();
  return TONES.find(([pattern]) => pattern.test(key))?.[1] ?? 'neutral';
}

/** `needs_review` reads as "Needs review" — underscores are storage, not copy. */
function humanize(status: string): string {
  const words = status.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function GenericStatusBadge({
  status,
  size = 'sm',
}: {
  status: string;
  size?: 'sm' | 'md';
}) {
  if (!status.trim()) return <span className="text-text-muted">—</span>;
  const variant = toneFor(status);
  return (
    <StatusBadge
      status={variant}
      variantMap={{ success: 'success', danger: 'danger', warning: 'warning', info: 'info', neutral: 'neutral' }}
      label={humanize(status)}
      size={size}
    />
  );
}
