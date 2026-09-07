'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { resendLetter } from '../../lib/actions';

/**
 * Sends a letter again after it failed or came back.
 *
 * Only rendered for letters in the returned bucket. One that is still queued or
 * in transit is already on its way, and re-queueing it would print and post a
 * second copy of something the recipient is about to receive — the API refuses
 * that too, so the rule holds even if this button is ever shown by mistake.
 */
export function ResendLetterButton({ communicationId }: { communicationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await resendLetter(communicationId);
            toast.success('Back in the queue. It goes out on the next run.');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not send it again');
          }
        })
      }
    >
      <RotateCcw className="size-3.5" />
      {pending ? 'Sending…' : 'Send again'}
    </Button>
  );
}
