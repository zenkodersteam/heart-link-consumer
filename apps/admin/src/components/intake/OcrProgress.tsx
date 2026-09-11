'use client';

import type { OcrStatus } from '@heartlink/api-contract';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { isOcrRunning } from '../../lib/ocr';

import { cn } from '../../lib/utils';

/**
 * What text recognition is doing to a scan, while it is doing it.
 *
 * A scan is read by a background worker, so the page that queued it has
 * nothing to show and no reason to change: the status was written once at
 * render and then sat there. Someone who pressed "Read again" saw a toast go
 * by and then a row that looked exactly as it had before — no way to tell a
 * read in progress from one that never started, short of reloading the page
 * every few seconds, which is what people were doing.
 *
 * So this polls while the answer can still change, and stops the moment it
 * cannot. The bar is deliberately not a real percentage — OCR reports no
 * progress, and inventing one that crawls to 90% and waits is a lie people
 * learn to distrust. It moves because work is happening; the label says what
 * stage that work is at.
 */

/** Brisk while a read is fresh — most finish inside a few seconds. */
const FAST_POLL_MS = 2_500;
/** Then back off: a queue with a backlog can take minutes, and each poll re-renders the page. */
const SLOW_POLL_MS = 8_000;
const BACK_OFF_AFTER_MS = 30_000;
/** Past this we stop asking. Something is wrong, and saying so beats spinning forever. */
const GIVE_UP_AFTER_MS = 5 * 60_000;

const STAGE: Record<OcrStatus, { label: string; percent: number; tone: string }> = {
  pending: { label: 'Queued to be read', percent: 20, tone: 'bg-info' },
  processing: { label: 'Reading the scan', percent: 70, tone: 'bg-info' },
  completed: { label: 'Read', percent: 100, tone: 'bg-success' },
  failed: { label: 'Could not be read', percent: 100, tone: 'bg-danger' },
  not_applicable: { label: 'Not a scanned application', percent: 0, tone: 'bg-border' },
};


export function OcrProgress({
  status,
  className,
  /** Shown under the bar once a read has finished — the name that was found, say. */
  detail,
}: {
  status: OcrStatus;
  className?: string;
  detail?: string;
}) {
  const router = useRouter();
  const running = isOcrRunning(status);
  const [startedAt] = useState(() => Date.now());
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    // Nothing to watch once it has settled. `gaveUp` is only ever read while
    // running, so there is nothing to reset here either.
    if (!running) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed > GIVE_UP_AFTER_MS) {
        setGaveUp(true);
        return;
      }
      // `router.refresh()` re-runs the server component, which is where the
      // status comes from. Nothing else on the page is lost: form state and
      // scroll position survive a refresh.
      router.refresh();
      if (!cancelled) {
        timer = setTimeout(tick, elapsed > BACK_OFF_AFTER_MS ? SLOW_POLL_MS : FAST_POLL_MS);
      }
    };

    timer = setTimeout(tick, FAST_POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [running, router, startedAt]);

  if (status === 'not_applicable') return null;

  const stage = STAGE[status];

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'text-[11px] font-medium uppercase tracking-wide',
            status === 'failed' ? 'text-danger' : status === 'completed' ? 'text-success' : 'text-info',
          )}
        >
          {stage.label}
        </span>
        {running ? (
          <span className="text-[11px] text-text-muted">
            {gaveUp ? 'Taking longer than usual' : 'Checking…'}
          </span>
        ) : null}
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label="Text recognition progress"
        aria-valuetext={stage.label}
        // Indeterminate while it runs: there is no real number to report, and
        // `aria-valuenow` on a made-up one would read that fiction aloud.
        aria-valuenow={running ? undefined : 100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            stage.tone,
            running && !gaveUp && 'animate-pulse',
          )}
          style={{ width: `${stage.percent}%` }}
        />
      </div>

      {detail ? <span className="text-[12px] text-text-muted">{detail}</span> : null}
      {running && gaveUp ? (
        <span className="text-[12px] text-text-muted">
          Still queued. The reader may be busy — leave it, or try reading it again.
        </span>
      ) : null}
    </div>
  );
}
