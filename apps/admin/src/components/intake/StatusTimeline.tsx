import type { AuditLogEntry } from '@heartlink/api-contract';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { formatTimelineDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

/** Figma `13:192`: vertical timeline of audit events */
export function StatusTimeline({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Timeline</CardTitle>
      </CardHeader>
      <div className="flex flex-col">
        {entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-muted">
            No activity yet.
          </div>
        ) : (
          entries.map((entry, idx) => (
            <TimelineEvent
              key={entry.id}
              entry={entry}
              isFirst={idx === 0}
              isLast={idx === entries.length - 1}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function TimelineEvent({
  entry,
  isFirst,
  isLast,
}: {
  entry: AuditLogEntry;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { title, subtitle } = humanize(entry);
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="relative flex h-10 w-3 shrink-0 items-start justify-center">
        <span
          className={cn(
            'mt-1 size-3 shrink-0 rounded-full',
            isFirst ? 'bg-primary' : 'bg-border',
          )}
          aria-hidden
        />
        {!isLast && (
          <span
            className="absolute left-1/2 top-4 h-6 w-px -translate-x-1/2 bg-border"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium leading-[18px] text-text">
          {title}
        </span>
        <span className="text-xs leading-4 text-text-muted">{subtitle}</span>
      </div>
    </div>
  );
}

function humanize(entry: AuditLogEntry): { title: string; subtitle: string } {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const actor =
    entry.actorType === 'user'
      ? 'Staff'
      : entry.actorType === 'automation'
        ? 'System'
        : 'System';
  const subtitle = `${actor} · ${formatTimelineDate(entry.createdAt)}`;

  switch (entry.action) {
    case 'application.created':
      return { title: 'Application created', subtitle };
    case 'application.status_changed': {
      const to = (meta.to as string) ?? 'unknown';
      return {
        title: `Status changed to ${to.replace(/_/g, ' ')}`,
        subtitle,
      };
    }
    case 'document.uploaded':
      return { title: 'Document uploaded', subtitle };
    case 'document.fields_corrected': {
      const keys = (meta.changedKeys as string[] | undefined) ?? [];
      const count = keys.length;
      return {
        title: `Fields corrected${count ? ` (${count})` : ''}`,
        subtitle,
      };
    }
    default:
      return { title: entry.action, subtitle };
  }
}
