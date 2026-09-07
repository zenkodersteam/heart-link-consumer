'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { TransitionDialog } from './TransitionDialog';
import type { ApplicationStatus } from '@heartlink/api-contract';
import { canTransitionApplication } from '@heartlink/domain';
import { transitionApplicationStatus } from '../../lib/actions';
import { canUploadReturnedScan, getManualStatusAdvance } from '../../lib/intakeProgression';

export function DetailActions({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
}) {
  const [open, setOpen] = useState<'incomplete' | 'rejected' | 'verified' | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const canApprove = canTransitionApplication(currentStatus, 'verified');
  const canReject = canTransitionApplication(currentStatus, 'rejected');
  const canIncomplete = canTransitionApplication(currentStatus, 'incomplete');
  const manualAdvance = getManualStatusAdvance(currentStatus);
  const canUploadScan = canUploadReturnedScan(currentStatus);

  const onAdvance = () => {
    if (!manualAdvance) return;
    startTransition(async () => {
      try {
        await transitionApplicationStatus({
          id: applicationId,
          status: manualAdvance.targetStatus,
        });
        toast.success(manualAdvance.successMessage);
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const onScanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/intake/${applicationId}/documents`, {
          method: 'POST',
          body: formData,
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!response.ok || !result?.ok) {
          toast.error(result?.error ?? 'Upload failed');
          return;
        }
        router.refresh();
        toast.success('Scanned application uploaded');
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {manualAdvance && (
          <Button size="sm" variant="primary" disabled={isPending} onClick={onAdvance}>
            {isPending ? 'Saving…' : manualAdvance.label}
          </Button>
        )}
        {canUploadScan && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={onScanChange}
            />
            <Button
              size="sm"
              variant="primary"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isPending ? 'Uploading…' : 'Upload Returned Scan'}
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="warning"
          disabled={!canIncomplete || isPending}
          onClick={() => setOpen('incomplete')}
        >
          Mark Incomplete
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={!canReject || isPending}
          onClick={() => setOpen('rejected')}
        >
          Reject
        </Button>
        <Button
          size="sm"
          variant="success"
          disabled={!canApprove || isPending}
          onClick={() => setOpen('verified')}
        >
          Approve
        </Button>
      </div>

      <TransitionDialog
        open={open === 'incomplete'}
        onOpenChange={(v) => setOpen(v ? 'incomplete' : null)}
        applicationId={applicationId}
        targetStatus="incomplete"
        reviewOutcome="incomplete"
        title="Mark as incomplete?"
        description="Flag this application as missing required information. Reviewer notes are required."
        confirmLabel="Mark Incomplete"
        confirmVariant="warning"
      />
      <TransitionDialog
        open={open === 'rejected'}
        onOpenChange={(v) => setOpen(v ? 'rejected' : null)}
        applicationId={applicationId}
        targetStatus="rejected"
        reviewOutcome="rejected"
        title="Reject application?"
        description="Reject this application. This is a terminal action. Reviewer notes are required."
        confirmLabel="Reject"
        confirmVariant="danger"
      />
      <TransitionDialog
        open={open === 'verified'}
        onOpenChange={(v) => setOpen(v ? 'verified' : null)}
        applicationId={applicationId}
        targetStatus="verified"
        reviewOutcome="approved"
        title="Approve application?"
        description="Verify this application. Reviewer notes are required."
        confirmLabel="Approve"
        confirmVariant="success"
      />
    </>
  );
}
