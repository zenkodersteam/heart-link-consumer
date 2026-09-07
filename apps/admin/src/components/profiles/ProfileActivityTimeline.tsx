import type { AuditLogEntry } from '@heartlink/api-contract';
import { formatTimelineDate } from '../../lib/utils';

export function ProfileActivityTimeline({
  entries,
}: {
  entries: AuditLogEntry[];
}) {
  if (entries.length === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-5">
        <h3 className="font-serif text-base leading-6 text-text">
          Activity Timeline
        </h3>
        <p className="text-sm text-text-muted">No activity yet.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-background p-5">
      <h3 className="font-serif text-base leading-6 text-text">
        Activity Timeline
      </h3>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-0.5 text-[13px]">
            <span className="text-text-muted">
              {formatTimelineDate(entry.createdAt)}
            </span>
            <span className="text-text">{describe(entry)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function describe(entry: AuditLogEntry): string {
  const actor = entry.actorType === 'automation' ? 'System' : 'Staff';
  switch (entry.action) {
    case 'profile.created':
      return `${actor} - Profile created from application`;
    case 'profile.updated':
      return `${actor} - Profile updated`;
    case 'profile.status_changed': {
      const meta = entry.metadata as { from?: string; to?: string } | null;
      return `${actor} - Status ${meta?.from ?? '?'} → ${meta?.to ?? '?'}`;
    }
    case 'profile.primary_photo_changed':
      return `${actor} - Primary photo changed`;
    case 'profile_photo.uploaded':
      return `${actor} - Photo uploaded`;
    case 'profile_photo.moderated': {
      const meta = entry.metadata as { to?: string } | null;
      return `${actor} - Photo ${meta?.to ?? 'moderated'}`;
    }
    case 'profile_photo.deleted':
      return `${actor} - Photo deleted`;
    default:
      return `${actor} - ${entry.action}`;
  }
}
