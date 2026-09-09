'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Facility, FacilityStatus } from '@heartlink/api-contract';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { createFacility, updateFacility } from '../../lib/actions';
import { Select } from '../ui/select';
import { AddressField } from '../ui/address-autocomplete';

interface Props {
  mode: 'create' | 'edit';
  facility?: Facility;
  trigger: React.ReactNode;
}

interface FormState {
  name: string;
  state: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  zip: string;
  notes: string;
  status: FacilityStatus;
}

const EMPTY: FormState = {
  name: '',
  state: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  zip: '',
  notes: '',
  status: 'active',
};

function fromFacility(f: Facility): FormState {
  return {
    name: f.name,
    state: f.state,
    addressLine1: f.addressLine1,
    addressLine2: f.addressLine2 ?? '',
    city: f.city,
    zip: f.zip,
    notes: f.notes ?? '',
    status: f.status,
  };
}

export function FacilityFormDialog({ mode, facility, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(
    facility ? fromFacility(facility) : EMPTY,
  );

  useEffect(() => {
    if (open) {
      // Reset the form to match the current facility each time the dialog opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(facility ? fromFacility(facility) : EMPTY);
    }
  }, [open, facility]);

  const onSubmit = () => {
    if (form.name.trim().length === 0) {
      toast.error('Name is required');
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(form.state.trim())) {
      toast.error('State must be a 2-letter code');
      return;
    }
    if (form.addressLine1.trim().length === 0) {
      toast.error('Address is required');
      return;
    }
    if (form.city.trim().length === 0) {
      toast.error('City is required');
      return;
    }
    if (form.zip.trim().length < 3) {
      toast.error('ZIP is required');
      return;
    }

    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createFacility({
            name: form.name.trim(),
            state: form.state.trim().toUpperCase(),
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim() || null,
            city: form.city.trim(),
            zip: form.zip.trim(),
            notes: form.notes.trim() || null,
          });
          toast.success(`Created facility "${form.name.trim()}"`);
        } else if (facility) {
          await updateFacility({
            id: facility.id,
            name: form.name.trim(),
            state: form.state.trim().toUpperCase(),
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim() || null,
            city: form.city.trim(),
            zip: form.zip.trim(),
            status: form.status,
            notes: form.notes.trim() || null,
          });
          toast.success(`Updated facility "${form.name.trim()}"`);
        }
        setOpen(false);
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Facility' : 'Edit Facility'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Add a correctional facility we accept applications from.'
                : 'Update the facility details, mailing address, or status.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="facility-name">Name</Label>
              <Input
                id="facility-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="facility-addr1">Address line 1</Label>
              {/* A facility address is where letters are actually posted, so a
                  well-formed but wrong one costs postage and comes back weeks
                  later, if at all. Searching in this field and filling all four
                  from one result keeps them consistent with each other. */}
              <AddressField
                id="facility-addr1"
                value={form.addressLine1}
                onChange={(addressLine1) => setForm((f) => ({ ...f, addressLine1 }))}
                onSelect={(parts) =>
                  setForm((f) => ({
                    ...f,
                    addressLine1: parts.line1,
                    city: parts.city,
                    state: parts.state,
                    zip: parts.zip,
                  }))
                }
                placeholder="Start typing an address…"
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="facility-addr2">Address line 2 (optional)</Label>
              <Input
                id="facility-addr2"
                value={form.addressLine2}
                onChange={(e) =>
                  setForm({ ...form, addressLine2: e.target.value })
                }
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility-city">City</Label>
              <Input
                id="facility-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility-state">State</Label>
              <Input
                id="facility-state"
                value={form.state}
                onChange={(e) =>
                  setForm({ ...form, state: e.target.value.toUpperCase() })
                }
                maxLength={2}
                disabled={isPending}
                placeholder="TX"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility-zip">ZIP</Label>
              <Input
                id="facility-zip"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                disabled={isPending}
              />
            </div>
            {mode === 'edit' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="facility-status">Status</Label>
                <Select
                  id="facility-status"
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as FacilityStatus })}
                  disabled={isPending}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
            )}
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="facility-notes">Notes (optional)</Label>
              <Textarea
                id="facility-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                disabled={isPending}
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
            <Button
              variant="primary"
              size="sm"
              onClick={onSubmit}
              disabled={isPending}
            >
              {isPending
                ? mode === 'create'
                  ? 'Adding…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Add facility'
                  : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
