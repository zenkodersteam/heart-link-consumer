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
    <div className="grid grid-cols-3 overflow-hidden rounded-[14px] border border-gold/35 bg-gradient-to-b from-[#fffdfa] to-[#fbf4ec]">
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

/**
 * A section of the profile, on its own surface.
 *
 * The page used to be one unbroken column of text and chips on the page
 * background, so every section carried the same weight as the one before it and
 * nothing told you where one ended. A card per section is what makes it
 * scannable — and gives the gold rules something to sit on.
 */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'rounded-card border border-line bg-surface-elevated p-5 shadow-[0_2px_14px_rgba(22,5,31,0.05)] lg:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Uppercase gold label with a hairline rule running out to the margin. */
export function SectionHeader({ label }: { label: string }) {
  return (
    // No top margin: a panel owns its own padding, and the header is the first
    // thing in it.
    <div className="flex items-center gap-3">
      <h2 className="text-[11.5px] font-bold uppercase tracking-[2px] text-gold">{label}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
    </div>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>;
}

export function Chip({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    // `bg-surface`, not `surface-elevated`: chips now sit inside panels that are
    // themselves elevated, and white on white left them relying on a hairline
    // gold border alone to be seen.
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-gold/40 bg-surface px-3.5 py-2 text-[13px] text-ink">
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
