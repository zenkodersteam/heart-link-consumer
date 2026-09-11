import type { AuditLogEntry } from '@heartlink/api-contract';
import { LocalTime } from '@/components/ui/LocalTime';

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
              <LocalTime value={entry.createdAt} />
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
    case 'profile_photo.imported_from_intake':
      return `${actor} - Photos imported from intake`;
    case 'profile.reported':
      return `${actor} - Profile reported`;
    case 'sponsor_invite.sent':
      return `${actor} - Sponsor invite sent`;
    case 'application.created':
      return `${actor} - Application created`;
    case 'application.status_changed': {
      const meta = entry.metadata as { from?: string; to?: string } | null;
      return `${actor} - Application ${meta?.from ?? '?'} → ${meta?.to ?? '?'}`;
    }
    case 'document.uploaded':
      return `${actor} - Scan uploaded`;
    case 'document.ocr_retried':
      return `${actor} - Scan sent to be read again`;
    case 'document.fields_corrected':
      return `${actor} - Scanned fields corrected`;
    case 'payment.confirmed':
      return `${actor} - Payment confirmed`;
    case 'payment.matched':
      return `${actor} - Payment matched`;
    case 'subscription.status_changed': {
      const meta = entry.metadata as { from?: string; to?: string } | null;
      return `${actor} - Subscription ${meta?.from ?? '?'} → ${meta?.to ?? '?'}`;
    }
    default:
      return `${actor} - ${humanizeAction(entry.action)}`;
  }
}

/**
 * A readable sentence for an action nobody has written wording for yet.
 *
 * The fallback used to print the raw key, so the timeline read
 * "System - sponsor_invite.sent" beside sentences in plain English. New
 * actions are added on the API side all the time and the console should not
 * leak database vocabulary at people while it catches up.
 */
function humanizeAction(action: string): string {
  const [subject, verb] = action.includes('.') ? action.split('.') : ['', action];
  const words = `${subject ? `${subject.replace(/_/g, ' ')} ` : ''}${(verb ?? '').replace(/_/g, ' ')}`
    .trim()
    .toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : action;
}
