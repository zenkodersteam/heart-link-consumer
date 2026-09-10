'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
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
  sizes = '(max-width: 640px) 100vw, 420px',
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  /**
   * What width this photo is actually drawn at, so the optimiser can send a
   * file that size instead of the original. Worth setting at every call site:
   * the default assumes a card, and an avatar left on it downloads a card.
   */
  sizes?: string;
}) {
  // The failure is remembered against the URL that produced it, rather than as
  // a bare flag reset by an effect: a new photo then starts clean on the same
  // render, with no frame where a fresh URL is still treated as broken.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const failed = failedSrc !== null && failedSrc === src;
  const loaded = loadedSrc !== null && loadedSrc === src;

  if (!src || failed) {
    return <PhotoStandIn name={name} className={className} />;
  }

  // The stand-in sits underneath rather than instead of the photo, so the
  // moment before a presigned S3 image arrives shows the branded circle rather
  // than an empty one. These images are full-size originals on a rotating
  // host, so that moment is long enough to look broken.
  return (
    <div className={cn('relative h-full w-full', className)}>
      <PhotoStandIn name={name} className="absolute inset-0" />
      {/* Optimised rather than served whole: uploads are full-size originals
          from a phone camera, and a 4 MB file was being downloaded into a 44px
          circle. The host is allowed through `images.remotePatterns` in
          next.config, derived from the API base URL. */}
      <Image
        src={src}
        alt={name ?? ''}
        fill
        sizes={sizes}
        // Presigned links carry an expiry and a signature, so the same photo
        // has a different URL each time it is issued. That is the optimiser's
        // cache key, so a cached copy is not reused across issues — each first
        // view still pays for a resize, but never for the original's full size.
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={cn(
          'object-cover transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}

/** The branded circle shown before a photo arrives, and instead of one that never does. */
function PhotoStandIn({ name, className }: { name?: string | null; className?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase();
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
