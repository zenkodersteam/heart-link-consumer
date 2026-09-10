import { cn } from '@/lib/utils';

/**
 * Brand spinner. `aria-label` rather than a visually hidden span so screen
 * readers announce it without adding a stray text node to the layout.
 *
 * Deliberately still a plain ring: this one goes inside buttons, beside a
 * label, at 16px, where anything more decorative reads as noise and fights the
 * text for attention. The whole-page wait is what gets the brand treatment -
 * see `PageSpinner` below.
 */
export function Spinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimension = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-9 border-[3px]' }[size];
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-primary/25 border-t-primary',
        dimension,
        className,
      )}
    />
  );
}

/**
 * The mark, beating.
 *
 * A route-level wait is the one moment the whole screen belongs to us, and a
 * grey ring spends it saying nothing. This is the emblem instead: the heart
 * beats in a real lub-dub rhythm, a glow swells under it on the same beat, and
 * a gold bead runs the orbit from the app icon. Nothing here is load-bearing -
 * it is the same wait either way - but a wait that looks alive reads as the app
 * working rather than the app stuck.
 *
 * All three animations sit behind `prefers-reduced-motion`, so the reduced
 * setting gets the mark standing still rather than a jittering one.
 */
export function HeartPulse({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-20', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hl-loader-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff4f92" />
          <stop offset="55%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="#b80143" />
        </linearGradient>
        <radialGradient id="hl-loader-glow">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
          <stop offset="70%" stopColor="var(--color-primary)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow, swelling on the beat. */}
      <circle cx="32" cy="32" r="26" fill="url(#hl-loader-glow)" className="animate-hl-glow" />

      {/* The orbit, and the bead riding it. `transform-origin` is set in CSS:
          an SVG child rotates about the user-space origin otherwise, which
          swings the whole ring off the canvas instead of spinning it. */}
      <g className="animate-hl-orbit">
        <circle
          cx="32"
          cy="32"
          r="27"
          fill="none"
          stroke="var(--color-gold)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 13"
        />
        <circle cx="32" cy="5" r="2.6" fill="var(--color-gold-bright)" />
      </g>

      <g className="animate-hl-beat">
        <path
          d="M32 51.5C32 51.5 15 41.4 15 29.9C15 23.8 19.7 19 25.5 19C28.8 19 31.2 20.7 32 22.2C32.8 20.7 35.2 19 38.5 19C44.3 19 49 23.8 49 29.9C49 41.4 32 51.5 32 51.5Z"
          fill="url(#hl-loader-heart)"
          stroke="var(--color-gold-bright)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* The gloss off the emblem's upper lobe. Without it the fill reads as
            flat colour rather than the enamelled mark on the icon. */}
        <ellipse
          cx="25"
          cy="25.5"
          rx="4.6"
          ry="3.1"
          fill="#ffffff"
          fillOpacity="0.38"
          transform="rotate(-28 25 25.5)"
        />

        {/* The keyhole from the emblem - the detail that makes it this app's
            heart rather than a heart. */}
        <circle cx="32" cy="31" r="2.7" fill="var(--color-ink)" />
        <path d="M30.8 33.2H33.2L34 38.4H30Z" fill="var(--color-ink)" />
      </g>
    </svg>
  );
}

/** Full-height centred loader, for route-level `loading.tsx` files. */
export function PageSpinner({
  label = 'Loading…',
  /**
   * Centre in the window rather than in whatever box this happens to sit in.
   *
   * The route-level loading files render this on an otherwise empty page,
   * where `min-h-[60dvh]` centred it inside 60% of the viewport — which puts
   * it above the middle — and only as wide as its parent, which put it off to
   * one side. Both were right for a spinner inside a panel and wrong for one
   * that is the whole screen.
   */
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-5',
        fullScreen ? 'min-h-dvh' : 'min-h-[60dvh]',
      )}
    >
      <HeartPulse />
      {/* aria-hidden: the wrapper already announces the label, and letting the
          text be read as well says "Loading" twice. */}
      <p aria-hidden="true" className="animate-hl-loader-label text-sm text-ink-soft">
        {label}
      </p>
    </div>
  );
}
