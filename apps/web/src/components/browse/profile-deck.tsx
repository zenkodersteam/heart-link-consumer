'use client';

import type { PublicProfileSummary, SwipeAction } from '@heartlink/consumer-api';
import { ChevronLeft, ChevronRight, Heart, RotateCcw, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { DeckCard } from './deck-card';

/** Past this, letting go completes the swipe instead of springing back. */
const COMMIT_DISTANCE = 110;
/** How far a drag has to go before the stamp starts showing at all. */
const STAMP_START = 30;

interface Drag {
  x: number;
  y: number;
  dragging: boolean;
}

const AT_REST: Drag = { x: 0, y: 0, dragging: false };

/**
 * The card deck on the home screen.
 *
 * Drag the top card left or right, or use the three buttons. Behind it two more
 * cards sit slightly scaled and offset so the pile reads as a pile — they are
 * `aria-hidden` and untabbable, since they are decoration until they arrive.
 *
 * Pointer events rather than mouse or touch events: one code path covers a
 * mouse, a finger and a stylus, and pointer capture means a fast drag that
 * leaves the card still delivers its `up`, which is what stops a card sticking
 * to the cursor.
 */
export function ProfileDeck({
  profiles,
  releaseDate,
  savedIds,
  onAction,
  onToggleSave,
  canSecondLook,
}: {
  profiles: PublicProfileSummary[];
  releaseDate?: string | null;
  savedIds: Set<string>;
  onAction: (profile: PublicProfileSummary, action: SwipeAction) => void;
  onToggleSave: (profile: PublicProfileSummary) => void;
  canSecondLook: boolean;
}) {
  const [drag, setDrag] = useState<Drag>(AT_REST);
  // Set while a card is animating out, so its exit is not interrupted by
  // another gesture and the next card does not jump in early.
  const [leaving, setLeaving] = useState<'like' | 'pass' | null>(null);
  const start = useRef({ x: 0, y: 0 });

  const top = profiles[0];
  const behind = profiles.slice(1, 3);

  const commit = useCallback(
    (action: SwipeAction) => {
      if (!top || leaving) return;
      if (action === 'second_look') {
        onAction(top, action);
        return;
      }
      setLeaving(action === 'like' ? 'like' : 'pass');
      setDrag(AT_REST);
      // Long enough for the card to clear the frame; the list changing
      // underneath mid-flight is what made this look like a glitch.
      window.setTimeout(() => {
        setLeaving(null);
        onAction(top, action);
      }, 260);
    },
    [top, leaving, onAction],
  );

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (leaving) return;
    // Let the reactions inside the card (the heart) take their own clicks.
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY };
    setDrag({ x: 0, y: 0, dragging: true });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.dragging) return;
    setDrag({
      x: event.clientX - start.current.x,
      y: event.clientY - start.current.y,
      dragging: true,
    });
  }

  function onPointerUp() {
    if (!drag.dragging) return;
    if (drag.x > COMMIT_DISTANCE) commit('like');
    else if (drag.x < -COMMIT_DISTANCE) commit('pass');
    else setDrag(AT_REST);
  }

  if (!top) return null;

  const offset = leaving ? (leaving === 'like' ? 620 : -620) : drag.x;
  const lift = leaving ? -40 : drag.y * 0.25;
  const tilt = offset / 22;
  const stampStrength = Math.min(Math.max((Math.abs(offset) - STAMP_START) / 90, 0), 1);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full items-center justify-center gap-3">
        <DeckArrow side="left" onClick={() => commit('pass')} disabled={Boolean(leaving)} />

        <div className="relative h-[496px] w-full max-w-[386px] select-none">
          {/* Drawn back to front so the top card is last in the DOM and sits
              above the rest without a z-index on every one. */}
          {behind
            .map((profile, index) => (
              <div
                key={profile.id}
                aria-hidden
                className="absolute inset-0"
                style={{
                  transform: `translateX(${(index + 1) * 16}px) scale(${1 - (index + 1) * 0.04})`,
                  opacity: 1 - (index + 1) * 0.25,
                }}
              >
                <DeckCard profile={profile} interactive={false} />
              </div>
            ))
            .reverse()}

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={cn(
              'absolute inset-0 touch-pan-y',
              drag.dragging ? 'cursor-grabbing' : 'cursor-grab',
              !drag.dragging && 'transition-transform duration-[260ms] ease-out',
            )}
            style={{ transform: `translate(${offset}px, ${lift}px) rotate(${tilt}deg)` }}
          >
            <DeckCard
              profile={top}
              releaseDate={releaseDate}
              saved={savedIds.has(top.id)}
              onToggleSave={() => onToggleSave(top)}
            />

            {/* The stamps fade in with the drag, so the gesture says what it
                will do before you let go of it. */}
            <Stamp label="LIKE" tone="like" strength={offset > 0 ? stampStrength : 0} />
            <Stamp label="PASS" tone="pass" strength={offset < 0 ? stampStrength : 0} />
          </div>
        </div>

        <DeckArrow side="right" onClick={() => commit('like')} disabled={Boolean(leaving)} />
      </div>

      <div className="mt-6 flex items-start justify-center gap-10">
        <DeckAction label="Pass" onClick={() => commit('pass')} disabled={Boolean(leaving)}>
          <X className="size-7 text-sidebar" strokeWidth={2.5} />
        </DeckAction>
        <DeckAction
          label="Second Look"
          onClick={() => commit('second_look')}
          disabled={!canSecondLook || Boolean(leaving)}
        >
          <RotateCcw className="size-6 text-gold" strokeWidth={2.5} />
        </DeckAction>
        <DeckAction label="Like" onClick={() => commit('like')} disabled={Boolean(leaving)}>
          <Heart className="size-7 fill-primary text-primary" />
        </DeckAction>
      </div>
    </div>
  );
}

function Stamp({
  label,
  tone,
  strength,
}: {
  label: string;
  tone: 'like' | 'pass';
  strength: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-10 rounded-xl border-[3px] px-4 py-1.5 font-[family-name:var(--font-bree)] text-3xl tracking-wide',
        tone === 'like'
          ? 'left-8 -rotate-12 border-primary text-primary'
          : 'right-8 rotate-12 border-ink text-ink',
      )}
      style={{ opacity: strength }}
    >
      {label}
    </span>
  );
}

/** The chevrons either side, which the screens show on desktop only. */
function DeckArrow({
  side,
  onClick,
  disabled,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Pass' : 'Like'}
      className="hidden size-11 shrink-0 place-items-center rounded-full bg-surface-elevated text-ink shadow-[0_4px_14px_rgba(46,18,64,0.12)] transition-transform hover:scale-105 disabled:opacity-40 lg:grid"
    >
      <Icon className="size-5" />
    </button>
  );
}

function DeckAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-2 disabled:opacity-40"
    >
      <span className="grid size-[58px] place-items-center rounded-full bg-surface-elevated shadow-[0_6px_18px_rgba(46,18,64,0.14)] transition-transform group-enabled:group-hover:scale-105 group-enabled:group-active:scale-95">
        {children}
      </span>
      <span className="text-[13px] text-ink-soft">{label}</span>
    </button>
  );
}
