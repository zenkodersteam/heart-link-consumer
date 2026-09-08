'use client';

import type { PublicProfilePhoto } from '@heartlink/consumer-api';
import { ChevronLeft, ChevronRight, MapPin, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { ProfilePhoto } from './profile-photo';

/**
 * The photo pane on a profile: one photo per page, swipeable on a phone and
 * arrow-driven on a desktop, with the person's name and state sitting over the
 * scrim at the bottom.
 *
 * Paging is done by scrolling a snap container rather than by transforming a
 * track, so a touch swipe is the browser's own gesture — momentum, rubber-band
 * and all — instead of a hand-written drag that never quite matches it.
 */
export function PhotoCarousel({
  photos,
  fallbackUrl,
  name,
  age,
  state,
  verified,
  className,
}: {
  photos: PublicProfilePhoto[];
  fallbackUrl: string | null;
  name: string;
  age: number | null;
  state: string | null;
  verified: boolean;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // With no photos we still render one page, so the scrim, the name block and
  // the badge all keep their positions.
  const pages: { id: string; url: string | null }[] = photos.length
    ? photos.map((p) => ({ id: p.id, url: p.presignedUrl }))
    : [{ id: 'placeholder', url: fallbackUrl }];

  const goTo = useCallback((index: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }, []);

  // Derive the active page from the scroll position: it is the one source that
  // is right whether the page changed by swipe, arrow key or dot.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActive((current) => (current === index ? current : index));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const multiple = pages.length > 1;

  return (
    <div className={cn('group relative overflow-hidden bg-midnight', className)}>
      <div
        ref={scroller}
        className="hl-no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {pages.map((page) => (
          <div key={page.id} className="h-full w-full shrink-0 snap-center">
            <ProfilePhoto src={page.url} name={name} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-midnight/75 to-transparent" />

      {verified ? (
        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-pill border border-gold-bright bg-midnight/55 px-3 py-1.5 text-xs font-semibold text-gold-bright backdrop-blur-sm">
          <ShieldCheck className="size-3.5" /> Verified profile
        </span>
      ) : null}

      {multiple ? (
        <>
          <CarouselArrow
            side="left"
            disabled={active === 0}
            onClick={() => goTo(active - 1)}
          />
          <CarouselArrow
            side="right"
            disabled={active === pages.length - 1}
            onClick={() => goTo(active + 1)}
          />
        </>
      ) : null}

      <div
        className={cn(
          'pointer-events-none absolute inset-x-5 bottom-5',
          multiple && 'bottom-11',
        )}
      >
        <h1 className="truncate font-[family-name:var(--font-bree)] text-2xl text-sidebar-text sm:text-3xl">
          {name}
          {age != null ? <span className="ml-2.5 text-xl opacity-85">{age}</span> : null}
        </h1>
        {state ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-sidebar-text/90">
            <MapPin className="size-3.5" /> {state}
          </p>
        ) : null}
      </div>

      {multiple ? (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              aria-label={`Photo ${index + 1} of ${pages.length}`}
              aria-current={index === active}
              onClick={() => goTo(index)}
              className={cn(
                'h-[7px] rounded-full transition-all duration-200',
                index === active ? 'w-5 bg-gold-bright' : 'w-[7px] bg-white/45 hover:bg-white/70',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Hidden until the pane is hovered, so it never sits on top of a face on a phone. */
function CarouselArrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-surface/90 p-2 text-ink shadow-md transition-opacity',
        'sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
        'disabled:pointer-events-none disabled:opacity-0',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
