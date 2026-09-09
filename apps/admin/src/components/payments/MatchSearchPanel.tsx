'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Search } from 'lucide-react';
import type { MatchSuggestion } from '@heartlink/api-contract';
import { GenericStatusBadge } from '../ui/GenericStatusBadge';
import { isRedirectError } from '../../lib/redirect-error';
import { Button } from '../ui/button';
import {
  matchPayment,
  markPaymentException,
  searchMatchSuggestions,
} from '../../lib/actions';
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

// A server action that calls redirect() throws NEXT_REDIRECT by design; inside a
// client try/catch that surfaces as a fake error. Let redirect errors propagate
// so navigation proceeds instead of showing a false "failed" toast (PAY-02).
export function MatchSearchPanel({
  paymentId,
  initialSuggestions,
  initialQuery,
}: {
  paymentId: string;
  initialSuggestions: MatchSuggestion[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<MatchSuggestion[]>(initialSuggestions);
  const [searchPending, startSearchTransition] = useTransition();
  const [matchPending, startMatchTransition] = useTransition();
  const [exceptionOpen, setExceptionOpen] = useState(false);

  const onSearch = () => {
    startSearchTransition(async () => {
      try {
        const res = await searchMatchSuggestions(paymentId, query);
        setItems(res.items);
      } catch (err) {
        toast.error(
          `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  const onMatch = (suggestion: MatchSuggestion) => {
    startMatchTransition(async () => {
      try {
        await matchPayment({
          paymentId,
          // Prefer profile if known, else fall back to application
          profileId: suggestion.profileId ?? undefined,
          applicationId: suggestion.profileId ? undefined : (suggestion.applicationId ?? undefined),
        });
        toast.success('Payment matched');
      } catch (err) {
        if (isRedirectError(err)) throw err;
        toast.error(
          `Match failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <h3 className="mb-3 font-serif text-base leading-6 text-text">
        Find Application or Profile to Match
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        <label className="hl-control hl-control-focus hl-search-shell relative h-[36px] min-w-[220px] flex-1">
          <Search className="size-[14px] shrink-0" />
          <input
            className="flex-1 bg-transparent text-[13px] text-text placeholder:text-text-muted focus:outline-none"
            placeholder="Search by app number, profile name, or inmate ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearch();
              }
            }}
          />
        </label>
        <Button
          variant="primary"
          size="md"
          onClick={onSearch}
          disabled={searchPending}
        >
          {searchPending ? 'Searching…' : 'Search'}
        </Button>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[13px] text-text-muted">
          Search Results {query ? `(showing matches for "${query}")` : ''}
        </p>
        {items.length === 0 ? (
          <div className="flex h-[140px] items-center justify-center rounded-md border border-dashed border-border text-sm text-text-muted">
            No suggestions yet - try refining the search.
          </div>
        ) : (
          // Scrolls sideways rather than crushing its columns: the rows below
          // are fixed widths adding up to well over 700px, so on a laptop they
          // were squashing into each other.
          <div className="overflow-x-auto rounded-md border border-border">
            <div className="flex min-w-[720px] items-center bg-surface px-4 py-2.5 text-[13px] font-medium text-text-muted">
              <div className="w-[160px]">App Number</div>
              <div className="flex-1 min-w-0">Profile Name</div>
              <div className="flex-1 min-w-0">Facility</div>
              <div className="w-[110px]">Status</div>
              <div className="w-[100px]">Expected $</div>
              <div className="w-[80px]">Match %</div>
              <div className="w-[110px]">Action</div>
            </div>
            {items.map((s) => (
              <div
                key={`${s.applicationId ?? ''}-${s.profileId ?? ''}`}
                className="flex min-w-[720px] items-center border-b border-border px-4 py-3 text-sm text-text last:border-b-0"
              >
                <div className="w-[160px] truncate">{s.applicationNumber ?? '-'}</div>
                <div className="flex-1 min-w-0 truncate">
                  {s.profileDisplayName ?? '-'}
                </div>
                <div className="flex-1 min-w-0 truncate">{s.facilityName ?? '-'}</div>
                <div className="w-[110px]">
                  <GenericStatusBadge status={s.status} />
                </div>
                <div className="w-[100px] tabular-nums">
                  {s.expectedAmountCents != null
                    ? `$${(s.expectedAmountCents / 100).toFixed(2)}`
                    : '-'}
                </div>
                <div className="w-[80px] tabular-nums">{s.matchScore}%</div>
                <div className="w-[110px]">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onMatch(s)}
                    disabled={matchPending}
                  >
                    Match
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Separated from the search. This is not another way to match a payment,
          it is the way to give up on matching one — putting it beside the search
          button invited it to be pressed by mistake. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="min-w-0 text-[13px] text-text-muted">
          Cannot find what this payment was for?
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExceptionOpen(true)}
          className="border-warning text-warning"
        >
          <AlertTriangle className="size-4 mr-1" /> Mark as exception
        </Button>
      </div>

      <ExceptionDialog
        paymentId={paymentId}
        open={exceptionOpen}
        onOpenChange={setExceptionOpen}
      />
    </section>
  );
}

function ExceptionDialog({
  paymentId,
  open,
  onOpenChange,
}: {
  paymentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const valid = reason.trim().length >= 10;

  const onSubmit = () => {
    if (!valid) return;
    startTransition(async () => {
      try {
        await markPaymentException({ paymentId, reason: reason.trim() });
        toast.success('Marked as exception');
        onOpenChange(false);
        setReason('');
      } catch (err) {
        if (isRedirectError(err)) throw err;
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
          <DialogTitle>Mark Payment as Exception</DialogTitle>
          <DialogDescription>
            Use this when the payment can&apos;t be auto-matched (overpayment, wrong
            recipient, missing info). Logged in audit history.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reason">
            Reason <span className="text-danger">*</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="At least 10 characters…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            variant="warning"
            size="sm"
            onClick={onSubmit}
            disabled={!valid || isPending}
          >
            {isPending ? 'Saving…' : 'Mark Exception'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

