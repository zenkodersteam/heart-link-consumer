'use client';

import { useRouter } from 'next/navigation';
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
 *
 * The refresh afterwards is the point of the whole exercise: the action puts
 * the document straight back to `pending`, and without pulling that down the
 * row kept showing the previous result. A toast said something had happened
 * and the screen said otherwise, so people pressed it again.
 */
export function RetryOcrButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await retryDocumentOcr(documentId);
            toast.success('Reading the scan again', {
              description: 'You will see it move from queued to read on this page.',
            });
            router.refresh();
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
