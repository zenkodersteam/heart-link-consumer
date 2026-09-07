'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import type { PendingCommunicationItem } from '@heartlink/api-contract';
import { Button } from '../ui/button';
import { moderateLetter } from '../../lib/actions';

/**
 * Letters waiting to be approved before they are printed and posted.
 *
 * Every outbound letter stops here, and that is the point of holding them: once
 * a letter is posted it cannot be recalled, and the person receiving it has no
 * way to report a problem through the app. So the full text is shown rather
 * than a preview — approving something you have seen the first line of is not
 * approval.
 */
export function LetterApprovalList({ items }: { items: PendingCommunicationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
        Nothing waiting. Letters appear here as members send them.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <LetterCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

function LetterCard({ item }: { item: PendingCommunicationItem }) {
  const [pending, startTransition] = useTransition();
  const [confirmingReject, setConfirmingReject] = useState(false);

  const decide = (status: 'approved' | 'rejected') =>
    startTransition(async () => {
      try {
        await moderateLetter(item.id, status);
        toast.success(
          status === 'approved' ? 'Approved — it joins the post queue' : 'Rejected',
        );
        setConfirmingReject(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not record that decision');
      }
    });

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-background p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 font-serif text-base text-text">
          {item.subject?.trim() || 'Untitled letter'}
        </h3>
        <span className="text-[12px] text-text-muted">
          To {item.profileDisplayName || 'an unnamed listing'} ·{' '}
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </div>

      {/* The whole letter, scrollable. A preview is not enough to approve on. */}
      <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface/50 p-4 text-[13px] leading-6 text-text">
        {item.body?.trim() || <span className="text-text-muted">This letter has no text.</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="success" size="sm" disabled={pending} onClick={() => decide('approved')}>
          <Check className="size-4" /> Approve and post
        </Button>

        {/* Rejecting is confirmed rather than immediate: it is not undoable, and
            it is one button away from the approve everyone is here to press. */}
        {confirmingReject ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              className="border-danger text-danger"
              onClick={() => decide('rejected')}
            >
              {pending ? 'Rejecting…' : 'Yes, reject it'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmingReject(false)}
            >
              Cancel
            </Button>
            <span className="text-[12px] text-text-muted">
              The member is told, and their letter credit is returned.
            </span>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-danger"
            onClick={() => setConfirmingReject(true)}
          >
            <X className="size-4" /> Reject
          </Button>
        )}
      </div>
    </li>
  );
}
