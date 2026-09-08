'use client';

import { ArrowLeft, ShieldOff } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBlocks, useUnblockProfile } from '@/lib/queries';

/**
 * People this member has blocked, and the way back from a block made by
 * mistake.
 *
 * Reached from Privacy &amp; safety rather than the nav, so it carries its own
 * link back — there is no rail item to show where you are.
 */
export function Blocked() {
  const { data, isPending, isError, error, refetch } = useBlocks();
  const unblock = useUnblockProfile();
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/privacy-safety"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Privacy &amp; safety
      </Link>

      <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">Blocked</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        Blocked profiles do not appear when you browse, and you will not receive letters from them.
      </p>

      {isError ? (
        <div className="mt-6 rounded-card border border-line bg-surface-elevated p-6 text-center">
          <p className="text-sm text-ink-soft">
            {error instanceof Error ? error.message : 'We could not load your blocked list.'}
          </p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {isPending ? (
        <div className="mt-8 flex justify-center">
          <Spinner />
        </div>
      ) : null}

      {!isPending && !isError && items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-line bg-surface-elevated py-12">
          <ShieldOff className="size-6 text-ink-faint" aria-hidden />
          <p className="text-sm text-ink-faint">You have not blocked anyone.</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((b) => {
            const working = unblock.isPending && unblock.variables === b.profileId;
            return (
              <li
                key={b.profileId}
                className="flex items-center gap-3 rounded-[14px] border border-line bg-surface-elevated p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{b.displayName}</p>
                  <p className="text-[13px] text-ink-faint">
                    Blocked{' '}
                    <time dateTime={b.blockedAt}>
                      {new Date(b.blockedAt).toLocaleDateString()}
                    </time>
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-w-[88px] border-primary text-primary"
                  disabled={working}
                  onClick={() => unblock.mutate(b.profileId)}
                >
                  {working ? <Spinner size="sm" /> : 'Unblock'}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {unblock.isError ? (
        <p className="mt-4 text-[13px] text-danger" role="alert">
          We could not unblock that profile. Please try again.
        </p>
      ) : null}
    </div>
  );
}
