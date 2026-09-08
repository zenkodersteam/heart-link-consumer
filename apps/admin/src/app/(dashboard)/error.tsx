'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * What a staff screen shows when it fails.
 *
 * Without this, an error anywhere under the dashboard fell through to Next's
 * own crash page: a stack trace in development, a blank "something went wrong"
 * in production. Neither says what to do, and both lose the navigation, so the
 * only way out was the back button.
 *
 * `reset` re-runs the failed segment, which is genuinely worth trying — most
 * failures here are a request that did not come back, not broken code.
 *
 * The digest is shown deliberately. In production the real message is withheld,
 * and the digest is the only thing tying what a person saw to a line in the
 * server log, so it is the one useful thing to quote when reporting a problem.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[dashboard] segment failed', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 text-center">
        <span className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-full bg-danger-tint">
          <AlertTriangle className="size-5 text-danger" />
        </span>
        <h1 className="font-serif text-xl text-text">This screen could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Something went wrong fetching what belongs here. The rest of the portal still works, so
          you can carry on elsewhere if this keeps failing.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset} variant="primary" size="sm">
            <RotateCcw className="size-4" /> Try again
          </Button>
          {/* Client navigation, not a full page load: `window.location.assign`
              threw away the whole app and reloaded it, which on a screen that
              exists because something already failed is a slow blank flash. */}
          <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
            Back to dashboard
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-5 text-[11px] text-text-muted">
            Quote this if you report it: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
