'use client';

import { User } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const GRADIENTS = [
  'from-[#2e1240] via-[#451a5e] to-[#5a2178]',
  'from-[#1b0826] via-[#3a1550] to-[#4e1a6b]',
  'from-[#2a1038] via-[#3f1858] to-[#552073]',
];

/** Stable per-person gradient, so a card looks like itself between renders. */
function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/**
 * A profile photo, or a branded stand-in.
 *
 * Two cases produce no image and both need handling: the profile has no
 * approved photo yet, and the presigned URL fails — which happens whenever a
 * link expires. The second only shows up at render, so the fallback is driven
 * by `onError` rather than by a null URL alone.
 */
export function ProfilePhoto({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  // The failure is remembered against the URL that produced it, rather than as
  // a bare flag reset by an effect: a new photo then starts clean on the same
  // render, with no frame where a fresh URL is still treated as broken.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc !== null && failedSrc === src;

  const initial = name?.trim()?.[0]?.toUpperCase();

  if (!src || failed) {
    return (
      <div
        className={cn(
          'grid h-full w-full place-items-center bg-gradient-to-br',
          gradientFor(name ?? 'heartlink'),
          className,
        )}
      >
        {initial ? (
          <span className="grid size-16 place-items-center rounded-full border border-gold/50 bg-white/[0.06] font-[family-name:var(--font-bree)] text-3xl text-gold-bright">
            {initial}
          </span>
        ) : (
          <User className="size-9 text-gold-bright" />
        )}
      </div>
    );
  }

  // Plain <img>: these are presigned S3 URLs on a rotating host, which
  // next/image cannot optimise without whitelisting every bucket domain.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name ?? ''}
      onError={() => setFailedSrc(src)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
