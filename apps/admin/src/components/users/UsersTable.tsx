import Link from 'next/link';
import { CheckCircle2, KeyRound, MailWarning } from 'lucide-react';
import type { AdminUserRow } from '@heartlink/api-contract';

import { formatShortDate } from '../../lib/utils';
import { UserStatusBadge } from './UserStatusBadge';

/** Initials for the avatar, from whichever of the two names we have. */
function initials(row: AdminUserRow): string {
  const source = row.displayName?.trim() || row.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? '');
}

export function UsersTable({ items }: { items: AdminUserRow[] }) {
  if (items.length === 0) {
    return (
      <div className="hl-empty-state flex w-full flex-col items-center justify-center gap-1 px-6 py-16 text-center">
        <p className="text-sm font-medium text-text">No members match this search</p>
        <p className="text-sm text-text-muted">
          Try a different name or address, or clear the profile-status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="hl-table-shell w-full">
      <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
        <div className="flex-[1.6] min-w-0">Member</div>
        <div className="w-[150px]">Profile</div>
        <div className="w-[150px]">Account</div>
        <div className="w-[110px]">Joined</div>
      </div>

      {items.map((row, index) => (
        <Link
          key={row.id}
          href={`/users/${row.id}`}
          className={`flex items-center border-b border-border px-4 py-3 text-sm leading-5 text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 ${
            index % 2 === 1 ? 'bg-surface-muted' : 'bg-background'
          }`}
        >
          <div className="flex flex-[1.6] min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary"
            >
              {initials(row)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {row.displayName?.trim() || 'No name yet'}
              </span>
              <span className="block truncate text-[13px] text-text-muted">{row.email}</span>
            </span>
          </div>

          <div className="w-[150px]">
            <UserStatusBadge status={row.profileStatus} />
          </div>

          {/* Two facts support is always asked for: is the address confirmed,
              and have they set a password. Icons rather than two more pills, so
              the row stays scannable. */}
          <div className="flex w-[150px] items-center gap-3 text-[12px] text-text-muted">
            {row.emailVerifiedAt ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 aria-hidden className="size-3.5" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-warning">
                <MailWarning aria-hidden className="size-3.5" />
                Unverified
              </span>
            )}
            {row.hasPassword ? (
              <span className="inline-flex items-center gap-1" title="Has set a password">
                <KeyRound aria-hidden className="size-3.5" />
              </span>
            ) : null}
          </div>

          <div className="w-[110px] text-text-muted">{formatShortDate(row.createdAt)}</div>
        </Link>
      ))}
    </div>
  );
}
