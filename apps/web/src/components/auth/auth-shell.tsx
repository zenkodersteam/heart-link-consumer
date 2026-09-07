import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Wordmark } from '@/components/brand/wordmark';

/**
 * Split layout for the auth pages: bridge artwork on the left, the form on the
 * right. Below `lg` the art becomes a short banner rather than disappearing —
 * on a phone a full-height panel pushed the form off screen entirely.
 */
export function AuthShell({
  title,
  subtitle,
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
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="relative isolate flex h-48 shrink-0 flex-col justify-end overflow-hidden bg-midnight p-6 lg:sticky lg:top-0 lg:h-dvh lg:w-[46%] lg:p-12">
        <Image
          src="/art/signin-bridge.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 46vw"
          className="object-cover opacity-85"
        />
        {/* Veil, so the statement stays legible over the brightest part of the art. */}
        <div className="absolute inset-0 bg-gradient-to-b from-midnight/20 to-midnight/75" />

        <Link href="/" className="absolute left-6 top-6 z-10 lg:left-12 lg:top-10">
          <Wordmark onDark />
        </Link>

        <p className="relative z-10 font-[family-name:var(--font-bree)] text-2xl leading-snug text-sidebar-text lg:text-4xl">
          Every letter is a bridge.
          <br />
          <span className="text-gold-bright">Love knows no bounds.</span>
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-surface-elevated px-6 py-12">
        <div className="w-full max-w-[420px]">
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
