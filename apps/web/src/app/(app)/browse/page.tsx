'use client';

import type { ListPublicProfilesQuery } from '@heartlink/consumer-api';
import { Compass, Heart, MapPin, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ProfilePhoto } from '@/components/profiles/profile-photo';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { usePublicProfiles, useSavedProfiles, useToggleSaved } from '@/lib/queries';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function BrowsePage() {
  const [query, setQuery] = useState<ListPublicProfilesQuery>({ limit: PAGE_SIZE, offset: 0 });
  const { data, isPending, isError, error, refetch } = usePublicProfiles(query);
  const { data: saved } = useSavedProfiles();
  const toggleSaved = useToggleSaved();

  const savedIds = new Set((saved?.items ?? []).map((p) => p.id));
  const hasFilters = Boolean(query.state || query.gender || query.ageMin || query.ageMax);
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">
          Discover meaningful connections
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Verified members, ready for letters. Take your time.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-elevated px-3.5 py-2 text-sm">
          <SlidersHorizontal className="size-4 text-primary" />
          <span className="font-semibold text-ink">Filters</span>
        </span>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuery({ limit: PAGE_SIZE, offset: 0 })}
          >
            Reset
          </Button>
        ) : null}
      </div>

      {isPending ? <PageSpinner label="Finding people…" /> : null}

      {isError ? (
        <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-8 text-center">
          <p className="font-[family-name:var(--font-bree)] text-xl text-ink">
            Couldn&apos;t load profiles
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {error instanceof Error ? error.message : 'Please try again in a moment.'}
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && items.length === 0 ? (
        <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold bg-gold-faint">
            <Compass className="size-7 text-gold" />
          </span>
          <p className="mt-5 font-[family-name:var(--font-bree)] text-xl text-ink">
            {hasFilters ? 'No matches for these filters' : "You're all caught up"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {hasFilters
              ? 'Try widening your age, location or gender filters to see more people.'
              : 'You have seen everyone for now. New profiles are added as they clear review.'}
          </p>
          <Button
            className="mt-5"
            variant="secondary"
            onClick={() =>
              hasFilters ? setQuery({ limit: PAGE_SIZE, offset: 0 }) : void refetch()
            }
          >
            {hasFilters ? 'Reset filters' : 'Refresh'}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((profile) => {
          const isSaved = savedIds.has(profile.id);
          return (
            <article
              key={profile.id}
              className="group overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated shadow-[0_2px_12px_rgba(22,5,31,0.06)] transition-shadow hover:shadow-[0_14px_30px_rgba(22,5,31,0.14)]"
            >
              <Link href={`/profiles/${profile.id}`} className="relative block aspect-[4/5]">
                <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName} />
                {profile.isVerified ? (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-primary">
                    <ShieldCheck className="size-3" /> Verified
                  </span>
                ) : null}
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-[family-name:var(--font-bree)] text-lg text-ink">
                      {profile.displayName}
                      {profile.age != null ? (
                        <span className="ml-1.5 text-base text-gold">{profile.age}</span>
                      ) : null}
                    </h2>
                    {profile.facility?.state ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-faint">
                        <MapPin className="size-3" /> {profile.facility.state}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    aria-label={isSaved ? 'Remove from Liked' : 'Save to Liked'}
                    aria-pressed={isSaved}
                    onClick={() => toggleSaved.mutate({ id: profile.id, saved: isSaved })}
                    className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-colors hover:bg-primary-faint"
                  >
                    <Heart
                      className={cn(
                        'size-4',
                        isSaved ? 'fill-primary text-primary' : 'text-ink-faint',
                      )}
                    />
                  </button>
                </div>

                {profile.bioExcerpt ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {profile.bioExcerpt}
                  </p>
                ) : null}

                <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                  <Link href={`/profiles/${profile.id}`}>View profile</Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
