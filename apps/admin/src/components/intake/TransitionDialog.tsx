'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { isRedirectError } from '../../lib/redirect-error';
import { transitionApplicationStatus } from '../../lib/actions';
import type { ApplicationStatus, ReviewOutcome } from '@heartlink/api-contract';

export interface TransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  targetStatus: ApplicationStatus;
  reviewOutcome: ReviewOutcome;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: 'success' | 'warning' | 'danger';
  nextPath?: string;
}

export function TransitionDialog(props: TransitionDialogProps) {
  const {
    open,
    onOpenChange,
    applicationId,
    targetStatus,
    reviewOutcome,
    title,
    description,
    confirmLabel,
    confirmVariant,
    nextPath,
  } = props;

  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const valid = notes.trim().length >= 10;

  const handleConfirm = () => {
    if (!valid) return;
    startTransition(async () => {
      const settled = () => {
        toast.success(`Application ${reviewOutcome}`);
        onOpenChange(false);
        setNotes('');
      };

      try {
        await transitionApplicationStatus({
          id: applicationId,
          status: targetStatus,
          reviewOutcome,
          reviewNotes: notes.trim(),
          nextPath,
        });
        settled();
      } catch (err) {
        // A redirect is what success looks like when `nextPath` is set: the
        // action moves the reviewer to the next packet, and says so by
        // throwing. Rethrown, because that throw is the navigation.
        if (isRedirectError(err)) {
          settled();
          throw err;
        }
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to ${reviewOutcome}: ${msg}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-notes">
            Reviewer notes <span className="text-danger">*</span>
          </Label>
          <Textarea
            id="review-notes"
            placeholder="At least 10 characters explaining the decision…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
          />
          {!valid && notes.length > 0 && (
            <p className="text-xs text-danger">
              Notes must be at least 10 characters ({notes.trim().length} so far).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={!valid || isPending}
          >
            {isPending ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
