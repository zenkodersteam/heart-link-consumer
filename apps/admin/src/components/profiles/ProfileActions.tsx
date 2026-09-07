'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ActivationCheckResult, Profile } from '@heartlink/api-contract';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { activateProfile, transitionProfile } from '../../lib/actions';

export function ProfileActions({
  profile,
  activation,
}: {
  profile: Profile;
  activation: ActivationCheckResult;
}) {
  const [pendingDialog, setPendingDialog] = useState<
    null | { status: 'paused' | 'removed'; title: string; description: string; confirmLabel: string }
  >(null);
  const [isPending, startTransition] = useTransition();

  const onActivate = () => {
    if (!activation.ok) return;
    startTransition(async () => {
      try {
        await activateProfile(profile.id);
        toast.success('Profile activated');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {profile.status !== 'active' && profile.status !== 'removed' && (
          <Button
            variant="primary"
            size="md"
            disabled={!activation.ok || isPending}
            onClick={onActivate}
            title={
              !activation.ok && activation.reasons.length
                ? activation.reasons[0]
                : undefined
            }
          >
            Activate Profile
          </Button>
        )}
        <Button
          variant="warning"
          size="md"
          disabled={profile.status === 'paused' || profile.status === 'removed'}
          onClick={() =>
            setPendingDialog({
              status: 'paused',
              title: 'Pause Profile',
              description:
                'Pause this profile so it is no longer publicly visible. The profile owner keeps their data; activate again when ready.',
              confirmLabel: 'Pause',
            })
          }
        >
          Pause
        </Button>
        <Button
          variant="danger"
          size="md"
          disabled={profile.status === 'removed'}
          onClick={() =>
            setPendingDialog({
              status: 'removed',
              title: 'Remove Profile',
              description:
                'Remove this profile permanently. Audit history is retained, but the profile cannot be re-activated.',
              confirmLabel: 'Remove',
            })
          }
        >
          Remove
        </Button>
      </div>

      <ProfileTransitionDialog
        open={!!pendingDialog}
        onOpenChange={(open) => !open && setPendingDialog(null)}
        profileId={profile.id}
        targetStatus={pendingDialog?.status ?? 'paused'}
        title={pendingDialog?.title ?? ''}
        description={pendingDialog?.description ?? ''}
        confirmLabel={pendingDialog?.confirmLabel ?? 'Confirm'}
      />
    </>
  );
}

function ProfileTransitionDialog({
  open,
  onOpenChange,
  profileId,
  targetStatus,
  title,
  description,
  confirmLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  targetStatus: 'paused' | 'removed';
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const valid = notes.trim().length >= 10;

  const onConfirm = () => {
    if (!valid) return;
    startTransition(async () => {
      try {
        await transitionProfile({
          id: profileId,
          status: targetStatus,
          notes: notes.trim(),
        });
        toast.success(`Profile ${targetStatus}`);
        onOpenChange(false);
        setNotes('');
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : String(err)}`,
        );
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
          <Label htmlFor="notes">
            Notes <span className="text-danger">*</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="At least 10 characters explaining the decision…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
          />
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
            variant={targetStatus === 'removed' ? 'danger' : 'warning'}
            size="sm"
            onClick={onConfirm}
            disabled={!valid || isPending}
          >
            {isPending ? 'Saving…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
