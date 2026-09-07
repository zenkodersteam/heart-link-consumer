'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Segment-level error boundary. Catches render and data errors below the root
 * layout, so a failure shows this instead of a blank page.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is how a production error maps back to a server log line;
    // without it a report is untraceable.
    console.error('Unhandled error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        This one is on us. Try again, and if it keeps happening let support know.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
      {error.digest ? (
        <p className="mt-6 text-xs text-ink-faint">Reference: {error.digest}</p>
      ) : null}
    </main>
  );
}
