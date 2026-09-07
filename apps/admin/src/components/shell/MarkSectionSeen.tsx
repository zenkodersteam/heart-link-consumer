'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markNavSectionSeen } from '../../lib/actions';

/**
 * Clears a section's sidebar badge once its page has been opened.
 *
 * Renders nothing. It runs after the page has painted rather than during the
 * request, so marking a section read never delays showing it — and if the call
 * fails the badge simply stays up, which is the safe way round.
 *
 * `router.refresh()` afterwards so the sidebar re-reads its counts; without it
 * the badge would stay until the next navigation.
 */
export function MarkSectionSeen({ section }: { section: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void markNavSectionSeen(section).then(() => {
      if (!cancelled) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [section, router]);

  return null;
}
