import { StatusBadge } from './StatusBadge';

/**
 * A yes/no state as a pill, for the columns that had it as plain grey text.
 *
 * "Active", "Inactive" and — worse — a bare "Yes" under a heading called
 * Status read as data rather than state: they sit in the same weight and
 * colour as the slug beside them, so a scan down the column tells you nothing
 * without reading every row. A pill is the shape the rest of these tables
 * already use for status, and colour does the work the eye is doing anyway.
 */
const VARIANTS = { on: 'success', off: 'neutral' } as const;

export function ToggleBadge({
  on,
  onLabel,
  offLabel,
  size = 'sm',
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <StatusBadge
      status={on ? 'on' : 'off'}
      variantMap={VARIANTS}
      label={on ? onLabel : offLabel}
      size={size}
    />
  );
}
