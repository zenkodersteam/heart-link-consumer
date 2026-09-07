'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Facility } from '@heartlink/api-contract';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { createApplication } from '../../lib/actions';
import { Select } from '../ui/select';
import {
  APPLICATION_SOURCE_OPTIONS,
  buildCreateApplicationSuccessMessage,
} from '../../lib/intakeCreateFlow';

interface Props {
  facilities: Facility[];
  trigger: React.ReactNode;
}

export function IntakeCreateDialog({ facilities, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [facilityId, setFacilityId] = useState('');
  const [sourceChannel, setSourceChannel] = useState<'mail_request' | 'outreach' | 'referral' | 'facility_campaign' | 'staff_created'>('mail_request');

  const availableFacilities = useMemo(
    () => facilities.filter((facility) => facility.status === 'active'),
    [facilities],
  );

  const onSubmit = () => {
    if (!facilityId) {
      toast.error('Facility is required');
      return;
    }

    startTransition(async () => {
      try {
        const created = await createApplication({ facilityId, sourceChannel });
        toast.success(
          buildCreateApplicationSuccessMessage(created.applicationNumber, sourceChannel),
        );
        setOpen(false);
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Intake Application</DialogTitle>
            <DialogDescription>
              Start a real intake record for a packet request, referral, or staff-created onboarding case before the returned scan arrives.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intake-create-source">Origin</Label>
              <Select
                id="intake-create-source"
                value={sourceChannel}
                onValueChange={(v) =>
                  setSourceChannel(
                    v as
                      | 'mail_request'
                      | 'outreach'
                      | 'referral'
                      | 'facility_campaign'
                      | 'staff_created',
                  )
                }
                disabled={isPending}
                options={APPLICATION_SOURCE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="intake-create-facility">Facility</Label>
              <Select
                id="intake-create-facility"
                value={facilityId}
                onValueChange={setFacilityId}
                disabled={isPending}
                placeholder="Select a facility…"
                options={availableFacilities.map((f) => ({
                  value: f.id,
                  label: `${f.name} (${f.state})`,
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onSubmit} disabled={isPending}>
              {isPending ? 'Creating…' : 'Create application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
