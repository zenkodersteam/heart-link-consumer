'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUpRight, Check, UserPlus } from 'lucide-react';
import type { ModerationFlag } from '@heartlink/api-contract';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { StatusBadge, type StatusBadgeVariant } from '../ui/StatusBadge';
import { cn } from '../../lib/utils';
import { updateModerationFlag } from '../../lib/actions';

const SEVERITY_VARIANT: Record<ModerationFlag['severity'], StatusBadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

const STATUS_VARIANT: Record<ModerationFlag['status'], StatusBadgeVariant> = {
  open: 'warning',
  investigating: 'info',
  escalated: 'danger',
  resolved: 'success',
};

/** Turns `inappropriate_content` into `Inappropriate content`. */
function humanise(value: string): string {
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Reports waiting to be dealt with.
 *
 * Ordered worst-then-oldest by the API, so the list is already the order to
 * work in — a critical report from this morning above a low one from last week,
 * and nothing sitting unlooked-at indefinitely.
 */
export function FlagQueue({ flags }: { flags: ModerationFlag[] }) {
  if (flags.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
        Nothing reported. Reports appear here as members raise them.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {flags.map((flag) => (
        <FlagRow key={flag.id} flag={flag} />
      ))}
    </ul>
  );
}

function FlagRow({ flag }: { flag: ModerationFlag }) {
  const [pending, startTransition] = useTransition();
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState('');

  const act = (input: Parameters<typeof updateModerationFlag>[1], message: string) =>
    startTransition(async () => {
      try {
        await updateModerationFlag(flag.id, input);
        toast.success(message);
        setResolving(false);
        setNotes('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not update this report');
      }
    });

  const isClosed = flag.status === 'resolved';

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-background p-4',
        isClosed && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-text">
              {humanise(flag.reason)}
            </span>
            <StatusBadge status={flag.severity} variantMap={SEVERITY_VARIANT} size="sm" />
            <StatusBadge status={flag.status} variantMap={STATUS_VARIANT} size="sm" />
          </div>
          <span className="text-[12px] text-text-muted">
            {humanise(flag.entityType)}
            {flag.entityLabel ? ` · ${flag.entityLabel}` : ''}
            {flag.reportedByName ? ` · reported by ${flag.reportedByName}` : ''}
            {' · '}
            {new Date(flag.createdAt).toLocaleDateString()}
          </span>
          <span className="text-[12px] text-text-muted">
            {flag.assignedToName ? `Being handled by ${flag.assignedToName}` : 'Nobody is on this yet'}
          </span>
        </div>
      </div>

      {/* The decision, once made. Kept visible so a repeat report about the same
          member can be read against what happened last time. */}
      {flag.resolutionNotes ? (
        <div className="rounded-md border border-border bg-surface/50 p-3 text-[12px] leading-5 text-text">
          <span className="font-medium">Decision:</span> {flag.resolutionNotes}
          {flag.resolvedByName ? (
            <span className="text-text-muted"> — {flag.resolvedByName}</span>
          ) : null}
        </div>
      ) : null}

      {resolving ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What was decided, and why?"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              size="sm"
              disabled={pending || notes.trim().length === 0}
              onClick={() => act({ status: 'resolved', resolutionNotes: notes }, 'Report closed')}
            >
              <Check className="size-4" /> Close this report
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => setResolving(false)}>
              Cancel
            </Button>
            {/* Said plainly rather than discovered by pressing a disabled button. */}
            <span className="text-[12px] text-text-muted">
              A note is required — a report closed without one cannot be understood later.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {!flag.assignedToName ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => act({ assignedToId: 'me', status: 'investigating' }, 'Assigned to you')}
            >
              <UserPlus className="size-4" /> I'll take this
            </Button>
          ) : null}
          {flag.status !== 'escalated' && !isClosed ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              className="border-warning text-warning"
              onClick={() => act({ status: 'escalated', severity: 'critical' }, 'Escalated')}
            >
              <ArrowUpRight className="size-4" /> Escalate
            </Button>
          ) : null}
          {!isClosed ? (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => setResolving(true)}>
              <Check className="size-4" /> Close…
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => act({ status: 'investigating' }, 'Reopened')}
            >
              <AlertTriangle className="size-4" /> Reopen
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
