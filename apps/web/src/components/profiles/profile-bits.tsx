import { Clock, Home, Mail, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The small pieces a profile is assembled from: the vitals strip, gold section
 * headers, chips and detail rows. Ported from the phone app's profile-bits so
 * a profile reads the same on both surfaces.
 */

export function VitalsStrip({
  releaseDate,
  state,
  acceptsMail,
}: {
  releaseDate: string | null;
  state: string | null;
  acceptsMail: boolean;
}) {
  const cells = [
    { icon: Clock, label: 'Coming home', value: releaseDate ?? 'Date not yet set' },
    { icon: Home, label: 'Located in', value: state ?? 'Not listed' },
    { icon: Mail, label: 'Mail', value: acceptsMail ? 'Accepted' : 'Not accepted' },
  ];
  return (
    <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-[14px] border border-gold/35 bg-gradient-to-b from-[#fffdfa] to-[#fbf4ec]">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            'flex flex-col items-center gap-1.5 px-2 py-3.5 text-center',
            i > 0 && 'border-l border-gold/25',
          )}
        >
          <cell.icon className="size-[17px] text-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-faint">
            {cell.label}
          </span>
          <span className="text-[13px] font-medium leading-tight text-ink">{cell.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Uppercase gold label with a hairline rule running out to the margin. */
export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <h2 className="text-[11.5px] font-bold uppercase tracking-[2px] text-gold">{label}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
    </div>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="mt-3.5 flex flex-wrap gap-2">{children}</div>;
}

export function Chip({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-gold/40 bg-surface-elevated px-3.5 py-2 text-[13px] text-ink">
      {Icon ? <Icon className="size-3.5 text-gold" /> : null}
      {label}
    </span>
  );
}

/** Hairline-divided "Label — Value" row. */
export function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <Icon className="size-4 shrink-0 text-gold" />
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="ml-auto text-right text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}
