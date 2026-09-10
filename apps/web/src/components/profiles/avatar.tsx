import { cn } from '@/lib/utils';

import { ProfilePhoto } from './profile-photo';

function initials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/**
 * Round avatar for the mailbox. Falls back to initials on a brand ground —
 * many correspondents have no approved photo, and a broken image icon in a
 * list of letters looks like something went wrong.
 */
export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-sidebar text-sm font-semibold text-sidebar-text',
        className,
      )}
    >
      {src ? (
        <ProfilePhoto src={src} name={name} sizes="96px" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
