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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { recordPayment } from '../../lib/actions';
import { PAYMENT_METHODS } from '../../lib/schemas';
import { Select } from '../ui/select';

const METHOD_LABEL: Record<(typeof PAYMENT_METHODS)[number], string> = {
  mail_check: 'Check',
  mail_money_order: 'Money Order',
  stripe: 'Stripe',
  manual: 'Manual',
};

export function RecordPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState('40.00');
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('mail_check');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');

  const reset = () => {
    setAmount('40.00');
    setMethod('mail_check');
    setPayerName('');
    setPayerEmail('');
    setPayerPhone('');
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  };

  const onSubmit = () => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }
    if (payerName.trim().length === 0) {
      toast.error('Payer name is required');
      return;
    }
    startTransition(async () => {
      try {
        const created = await recordPayment({
          amountCents,
          method,
          payerName: payerName.trim(),
          payerEmail: payerEmail.trim() || undefined,
          payerPhone: payerPhone.trim() || undefined,
          receivedDate: new Date(receivedDate).toISOString(),
          notes: notes.trim() || undefined,
        });
        toast.success(`Recorded ${created.paymentNumber}`);
        setOpen(false);
        reset();
      } catch (err) {
        toast.error(
          `Failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        + Record Payment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Log a mailed payment so it appears in the matching queue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="method">Method</Label>
              <Select
                id="method"
                value={method}
                onValueChange={(v) => setMethod(v as (typeof PAYMENT_METHODS)[number])}
                disabled={isPending}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))}
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="payerName">Payer Name</Label>
              <Input
                id="payerName"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payerEmail">Payer Email (optional)</Label>
              <Input
                id="payerEmail"
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payerPhone">Payer Phone (optional)</Label>
              <Input
                id="payerPhone"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="receivedDate">Received Date</Label>
              <Input
                id="receivedDate"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                placeholder="Memo line, check number, etc."
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
              {isPending ? 'Recording…' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
