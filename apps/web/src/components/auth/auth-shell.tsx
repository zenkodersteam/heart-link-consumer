import {
  BRAND_PROMISES,
  BRAND_SUBTITLE,
  BRAND_TAGLINE,
  type BrandPromiseIcon,
} from '@heartlink/consumer-content';
import { BookOpen, Headphones, Heart, Mail, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Split layout for the auth pages, following screen 10 of the client designs:
 * the brand panel on the left, the form on the right.
 *
 * The panel is deliberately light. It used to be a midnight photograph, which
 * looked well enough on its own but made signing in the one dark screen in a
 * product that is otherwise warm blush throughout — and the delivered designs
 * put the emblem, the tagline and the four promises there instead.
 *
 * Below `lg` the panel collapses to a short banner rather than disappearing: on
 * a phone a full-height panel pushed the form off screen entirely.
 */

/** The shared promise vocabulary, drawn with this surface's icon set. */
const PROMISE_ICONS: Record<BrandPromiseIcon, LucideIcon> = {
  heart: Heart,
  mail: Mail,
  book: BookOpen,
  support: Headphones,
};

export function AuthShell({
  title,
  subtitle,
  wide = false,
  children,
}: {
  /**
   * Optional: the sign-in form owns its own heading, because that heading
   * changes when it moves from asking for an address to asking for the code.
   * Two <h1>s on one page would be wrong, so the shell draws none when the
   * child brings its own.
   */
  title?: string;
  subtitle?: string;
  /**
   * Widens the form column for onboarding, whose lifestyle step lays out eight
   * groups of choice pills. At the sign-in width those wrap to one pill a line
   * and the step turns into a very long ladder.
   */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="relative isolate flex shrink-0 flex-col items-center justify-center gap-6 overflow-hidden bg-surface-canvas px-6 py-10 lg:sticky lg:top-0 lg:h-dvh lg:w-[46%] lg:px-12">
        {/* Barely-there blush wash. The panel in the designs is close to a flat
            warm cream; anything stronger reads as a stain rather than paper. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_620px_at_15%_0%,color-mix(in_srgb,var(--color-primary)_5%,transparent),transparent_70%),radial-gradient(760px_540px_at_90%_100%,color-mix(in_srgb,var(--color-gold)_7%,transparent),transparent_70%)]"
        />

        <Link href="/" className="flex flex-col items-center gap-3">
          <Image src="/heartlink-emblem.png" alt="" width={72} height={62} priority />
          <span className="font-[family-name:var(--font-bree)] text-4xl">
            <span className="text-ink">Heart</span>
            <span className="text-primary">Link</span>
          </span>
        </Link>

        <GoldRule />

        <div className="text-center">
          <p className="font-[family-name:var(--font-bree)] text-lg text-ink">{BRAND_TAGLINE}</p>
          <p className="mt-1.5 text-sm text-ink-soft">{BRAND_SUBTITLE}</p>
        </div>

        {/* The promise strip only earns its space on a tall panel. */}
        <ul className="mt-2 hidden w-full max-w-sm grid-cols-2 gap-x-4 gap-y-5 rounded-card border border-line bg-surface-elevated/70 p-5 lg:grid">
          {BRAND_PROMISES.map((promise) => {
            const Icon = PROMISE_ICONS[promise.icon];
            return (
              <li key={promise.key} className="flex flex-col items-center gap-1.5 text-center">
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="whitespace-pre-line text-[11.5px] leading-tight text-ink-soft">
                  {promise.title}
                </span>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* The short sign-in form centres; onboarding is taller than the viewport
          on most steps, so it starts at the top and scrolls from there. */}
      <main
        className={cn(
          'flex flex-1 justify-center bg-surface-elevated px-6 py-12',
          wide ? 'items-start' : 'items-center',
        )}
      >
        <div className={cn('w-full', wide ? 'max-w-[560px]' : 'max-w-[420px]')}>
          {title ? (
            <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">{title}</h1>
          ) : null}
          {subtitle ? <p className="mt-2 text-sm text-ink-soft">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Hairline with a gold heart at its centre, the divider used across the designs. */
function GoldRule() {
  return (
    <div className="flex w-full max-w-sm items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-gold-faint" />
      <Heart className="size-3 text-gold" />
      <span className="h-px flex-1 bg-gold-faint" />
    </div>
  );
}
