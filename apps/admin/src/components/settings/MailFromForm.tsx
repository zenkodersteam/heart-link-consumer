'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { updateMailFrom } from '../../lib/actions';

interface MailFrom {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY: MailFrom = { name: 'HeartLink', line1: '', line2: '', city: '', state: '', zip: '' };

export function MailFromForm({ initial }: { initial: MailFrom | null }) {
  const [form, setForm] = useState<MailFrom>(initial ?? EMPTY);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof MailFrom) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSave = () => {
    startTransition(async () => {
      try {
        await updateMailFrom({
          ...form,
          // Normalised here as well as server-side so the field visibly settles
          // to what will actually be sent.
          state: form.state.trim().toUpperCase(),
        });
        toast.success('Return address saved. Outbound letters will use it from now on.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save the return address');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="mf-name">Sender name</Label>
          <Input id="mf-name" value={form.name ?? ''} onChange={set('name')} placeholder="HeartLink" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="mf-line1">Street address</Label>
          <Input id="mf-line1" value={form.line1} onChange={set('line1')} placeholder="458 Unity Blvd" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="mf-line2">Suite / unit (optional)</Label>
          <Input id="mf-line2" value={form.line2 ?? ''} onChange={set('line2')} placeholder="Suite 100" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mf-city">City</Label>
          <Input id="mf-city" value={form.city} onChange={set('city')} placeholder="Columbus" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mf-state">State</Label>
            <Input
              id="mf-state"
              value={form.state}
              onChange={set('state')}
              maxLength={2}
              placeholder="OH"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mf-zip">ZIP</Label>
            <Input id="mf-zip" value={form.zip} onChange={set('zip')} placeholder="43215" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={pending} variant="primary">
          {pending ? 'Saving...' : 'Save return address'}
        </Button>
        <span className="text-[12px] text-text-muted">
          Two-letter state code. PostGrid rejects anything else.
        </span>
      </div>
    </div>
  );
}
