'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Application, IntakeDocument } from '@heartlink/api-contract';
import { DocumentViewerPanel } from './DocumentViewerPanel';
import { OcrFieldEditor } from './OcrFieldEditor';
import { Button } from '../ui/button';
import { TransitionDialog } from './TransitionDialog';

interface ReviewWorkspaceProps {
  application: Application;
  document: IntakeDocument | null;
  prevId: string | null;
  nextId: string | null;
  position: { current: number; total: number };
}

type TransitionAction = 'incomplete' | 'rejected' | 'verified';

export function ReviewWorkspace({
  application,
  document,
  prevId,
  nextId,
  position,
}: ReviewWorkspaceProps) {
  const [open, setOpen] = useState<TransitionAction | null>(null);

  const dialogConfigs: Record<
    TransitionAction,
    {
      status: 'incomplete' | 'rejected' | 'verified';
      outcome: 'incomplete' | 'rejected' | 'approved';
      title: string;
      description: string;
      confirmLabel: string;
      confirmVariant: 'warning' | 'danger' | 'success';
    }
  > = {
    incomplete: {
      status: 'incomplete',
      outcome: 'incomplete',
      title: 'Mark as incomplete?',
      description:
        'Flag this application as missing required information. It will stay in the review queue until resolved.',
      confirmLabel: 'Mark Incomplete',
      confirmVariant: 'warning',
    },
    rejected: {
      status: 'rejected',
      outcome: 'rejected',
      title: 'Reject application?',
      description: 'This is a terminal action. Reviewer notes are required.',
      confirmLabel: 'Reject',
      confirmVariant: 'danger',
    },
    verified: {
      status: 'verified',
      outcome: 'approved',
      title: 'Approve application?',
      description: 'Mark this application as verified. Reviewer notes are required.',
      confirmLabel: 'Approve',
      confirmVariant: 'success',
    },
  };

  const nextPath = nextId ? `/intake/review/${nextId}` : '/intake/review';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-surface px-6 py-3">
        <Link
          href="/intake"
          className="flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-primary hover:underline transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="size-4" />
          Back to Queue
        </Link>
        <div className="flex-1" />
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-[15px] leading-5 text-text">
            {application.applicationNumber}
          </span>
          <span className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-gold">
            {position.current} of {position.total}
          </span>
        </div>
        <div className="flex-1" />
        <Link
          href={prevId ? `/intake/review/${prevId}` : '#'}
          aria-disabled={!prevId}
          className={
            prevId
              ? 'inline-flex items-center gap-1 rounded-sm border border-border bg-background px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-text hover:bg-surface transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
              : 'inline-flex items-center gap-1 rounded-sm border border-border bg-background px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-text-muted opacity-50 pointer-events-none'
          }
        >
          <ChevronLeft className="size-4" />
          Previous
        </Link>
        <Link
          href={nextId ? `/intake/review/${nextId}` : '#'}
          aria-disabled={!nextId}
          className={
            nextId
              ? 'inline-flex items-center gap-1 rounded-sm border border-border bg-background px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-text hover:bg-surface transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
              : 'inline-flex items-center gap-1 rounded-sm border border-border bg-background px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-text-muted opacity-50 pointer-events-none'
          }
        >
          Next
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Split panels */}
      <div className="flex flex-1 min-h-0">
        <DocumentViewerPanel application={application} document={document} />
        <OcrFieldEditor
          applicationId={application.id}
          applicationNumber={application.applicationNumber}
          document={document}
        />
      </div>

      {/* Bottom action bar */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-6 py-3">
        {/* Saving field corrections lives in the field panel, next to the
            fields and to the form state that knows whether anything actually
            changed. This bar is for what happens to the application. Having
            both meant two Save buttons on one screen, and the one here could
            not grey itself out, so it answered "no changes to save". */}
        <div className="flex-1" />
        <Button size="sm" variant="warning" onClick={() => setOpen('incomplete')}>
          Mark Incomplete
        </Button>
        <Button size="sm" variant="danger" onClick={() => setOpen('rejected')}>
          Reject
        </Button>
        <Button size="sm" variant="success" onClick={() => setOpen('verified')}>
          Approve
        </Button>
      </div>

      {(['incomplete', 'rejected', 'verified'] as const).map((kind) => {
        const c = dialogConfigs[kind];
        return (
          <TransitionDialog
            key={kind}
            open={open === kind}
            onOpenChange={(v) => setOpen(v ? kind : null)}
            applicationId={application.id}
            targetStatus={c.status}
            reviewOutcome={c.outcome}
            title={c.title}
            description={c.description}
            confirmLabel={c.confirmLabel}
            confirmVariant={c.confirmVariant}
            nextPath={nextPath}
          />
        );
      })}
    </div>
  );
}
