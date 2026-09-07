'use client';

import { useTransition } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { dispatchQueuedLetters } from '../../lib/actions';

/**
 * Retry letters stranded at `queued`.
 *
 * A letter is stored before it is dispatched, so anything blocking dispatch
 * strands rows with no PostGrid id and nothing re-reads them later. Between
 * 2026-06-23 and 2026-07-26 an unset return address did exactly that to every
 * outbound letter. Fixing the address does not rescue the backlog; this does.
 *
 * Safe to press repeatedly - PostGrid idempotency is keyed on the communication
 * row id, so an already-accepted letter cannot be mailed twice.
 */
export function DispatchQueuedButton({ queued }: { queued: number }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      try {
        const res = await dispatchQueuedLetters();
        if (res.blocked.length) {
          toast.error(`Dispatch is blocked: ${res.blocked.join(' ')}`);
          return;
        }
        if (res.attempted === 0) {
          toast.success('Nothing queued - every letter has already been sent.');
          return;
        }
        if (res.failed) {
          toast.warning(
            `Sent ${res.dispatched} of ${res.attempted}. ${res.failed} failed and are marked for attention.`,
          );
          return;
        }
        toast.success(`Sent ${res.dispatched} queued ${res.dispatched === 1 ? 'letter' : 'letters'}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not dispatch the queue');
      }
    });
  };

  return (
    <Button onClick={onClick} disabled={pending || queued === 0} variant="primary">
      <Send className="size-4" />
      {pending ? 'Sending...' : queued > 0 ? `Send ${queued} queued` : 'Nothing queued'}
    </Button>
  );
}
