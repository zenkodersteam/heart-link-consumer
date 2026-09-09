import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, MailWarning } from 'lucide-react';
import type { AdminUserDetail } from '@heartlink/api-contract';

import { formatShortDate } from '../../lib/utils';
import { UserStatusBadge } from './UserStatusBadge';

function initials(user: AdminUserDetail): string {
  const source = user.displayName?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? '');
}

/**
 * Who this is, above everything else about them.
 *
 * The portrait is their own profile photo when they have one — this is a person
 * staff are about to make a decision about, and a face is worth more than a
 * second copy of their email address.
 */
export function UserHeader({ user }: { user: AdminUserDetail }) {
  const photo = user.profile?.primaryPhotoUrl ?? user.avatarUrl;

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-background px-6 py-5 shadow-soft md:px-7 md:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-gold/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/8 blur-3xl"
      />

      <div className="relative flex flex-col gap-5">
        <Link
          href="/users"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All members
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="size-16 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-semibold text-primary"
            >
              {initials(user)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-2xl leading-8 text-text">
              {user.displayName?.trim() || 'No name yet'}
            </h1>
            <p className="mt-0.5 truncate text-sm text-text-muted">{user.email}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
              <UserStatusBadge status={user.profile?.status ?? null} size="md" />

              {user.emailVerifiedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill-lg bg-success-tint px-2.5 py-1 font-medium text-success">
                  <CheckCircle2 aria-hidden className="size-3.5" />
                  Email verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-pill-lg bg-warning-tint px-2.5 py-1 font-medium text-warning">
                  <MailWarning aria-hidden className="size-3.5" />
                  Email not verified
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-pill-lg bg-neutral-tint px-2.5 py-1 font-medium text-neutral">
                <KeyRound aria-hidden className="size-3.5" />
                {user.hasPassword ? 'Password set' : 'Code sign-in only'}
              </span>

              <span className="text-text-muted">Joined {formatShortDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
