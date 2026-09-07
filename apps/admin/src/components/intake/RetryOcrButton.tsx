'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { retryDocumentOcr } from '../../lib/actions';

/**
 * Send a scan back through text recognition.
 *
 * Offered once an attempt has finished, whether it failed outright or came back
 * with fields nobody can use — both leave a reviewer equally stuck. Hidden while
 * a read is still in flight, because two workers writing fields to the same
 * document would leave whichever finished last.
 */
export function RetryOcrButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await retryDocumentOcr(documentId);
            toast.success('Reading the scan again. This usually takes a moment.');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not read the scan again');
          }
        })
      }
      className="inline-flex items-center justify-center rounded-sm border border-border px-3 py-1.5 text-xs font-medium leading-4 text-text hover:bg-surface disabled:opacity-60"
    >
      {pending ? 'Sending…' : 'Read again'}
    </button>
  );
}
