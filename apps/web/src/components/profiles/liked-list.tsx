'use client';

import { stateName, type PublicProfileSummary } from '@heartlink/consumer-api';
import { Check, ChevronDown, Heart, HeartOff, Images, MapPin, PenLine, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageSpinner } from '@/components/ui/spinner';
import { useSavedProfiles, useToggleSaved } from '@/lib/queries';

import { ProfilePhoto } from './profile-photo';

type SortKey = 'recent' | 'name' | 'age';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'age', label: 'Age' },
];

/**
 * Everyone this member has liked.
 *
 * The card is laid out horizontally rather than as a portrait tile: the photo's
 * height is then set by the row instead of growing with the column, and the
 * body keeps enough width for a bio excerpt and two full-size actions.
 */
export function LikedList() {
  const { data, isPending, isError, error, refetch } = useSavedProfiles();
  const toggleSaved = useToggleSaved();
  const [sort, setSort] = useState<SortKey>('recent');

  const items = useMemo(() => {
    const copy = [...(data?.items ?? [])];
    if (sort === 'name') copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    else if (sort === 'age') copy.sort((a, b) => (a.age ?? 0) - (b.age ?? 0));
    else copy.sort((a, b) => (b.activatedAt ?? '').localeCompare(a.activatedAt ?? ''));
    return copy;
  }, [data, sort]);

  const sortLabel = SORTS.find((option) => option.key === sort)?.label ?? 'Most recent';

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-6 sm:flex sm:items-start sm:justify-between sm:gap-6">
        <div>
          <h1 className="flex items-center gap-2.5 font-[family-name:var(--font-bree)] text-3xl text-ink">
            Liked
            <Heart className="size-5 fill-primary text-primary" />
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Profiles you&apos;ve liked and want to revisit.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <span className="text-xs text-ink-faint">Sort by:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-elevated px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-primary"
                >
                  {sortLabel}
                  <ChevronDown className="size-4 text-ink-faint" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SORTS.map((option) => (
                  <DropdownMenuItem key={option.key} onSelect={() => setSort(option.key)}>
                    <span className={option.key === sort ? 'font-semibold text-primary' : ''}>
                      {option.label}
                    </span>
                    {option.key === sort ? (
                      <Check className="ml-auto size-4 text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </header>

      {isPending ? <PageSpinner label="Opening your liked profiles…" /> : null}

      {isError ? (
        <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-8 text-center">
          <p className="font-[family-name:var(--font-bree)] text-xl text-ink">
            Your liked list is taking a moment
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            {error instanceof Error
              ? error.message
              : "We couldn't load your liked profiles just now."}
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && items.length === 0 ? (
        <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold bg-gold-faint">
            <Heart className="size-7 text-gold" />
          </span>
          <p className="mt-5 font-[family-name:var(--font-bree)] text-xl text-ink">
            No one saved yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            When someone stands out, tap the heart and they&apos;ll wait for you here. Real
            connections take a second look.
          </p>
          <Button asChild className="mt-6" variant="secondary">
            <Link href="/browse">Browse profiles</Link>
          </Button>
        </div>
      ) : null}

      <ul className="space-y-4">
        {items.map((profile) => (
          <li key={profile.id}>
            <LikedCard
              profile={profile}
              onUnsave={() => toggleSaved.mutate({ id: profile.id, saved: true })}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LikedCard({
  profile,
  onUnsave,
}: {
  profile: PublicProfileSummary;
  onUnsave: () => void;
}) {
  // Only `state` is on the summary; expanded so the card reads "Texas"
  // rather than "TX".
  const place = stateName(profile.facility?.state);

  return (
    <article className="flex overflow-hidden rounded-[--radius-card] border border-line bg-surface-elevated shadow-[0_2px_12px_rgba(22,5,31,0.06)] transition-shadow hover:shadow-[0_14px_30px_rgba(22,5,31,0.14)]">
      <Link
        href={`/profiles/${profile.id}`}
        className="relative w-28 shrink-0 self-stretch sm:w-[190px]"
      >
        <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName} />
        {profile.photoCount > 1 ? (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-[--radius-pill] bg-midnight/60 px-2 py-0.5 text-[11px] font-semibold text-sidebar-text">
            <Images className="size-3" />
            {profile.photoCount}
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link href={`/profiles/${profile.id}`} className="min-w-0">
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-bree)] text-lg text-ink">
                <span className="truncate">{profile.displayName}</span>
                {profile.age != null ? (
                  <span className="shrink-0 text-base font-semibold text-gold">{profile.age}</span>
                ) : null}
                {/* Same rule as browse and the profile page: shown only when
                    staff recorded an identity check. */}
                {profile.isVerified ? (
                  <ShieldCheck className="size-4 shrink-0 text-gold-bright" />
                ) : null}
              </h2>
            </Link>

            <button
              type="button"
              onClick={onUnsave}
              aria-label={`Remove ${profile.displayName} from Liked`}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-danger hover:text-danger"
            >
              <HeartOff className="size-4" />
            </button>
          </div>

          {place ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-faint">
              <MapPin className="size-3" /> {place}
            </p>
          ) : null}

          {profile.bioExcerpt ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
              {profile.bioExcerpt}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="secondary" size="sm" className="sm:flex-1">
            <Link href={`/profiles/${profile.id}`}>View profile</Link>
          </Button>
          <Button asChild size="sm" className="sm:flex-1">
            <Link
              href={`/mailbox?compose=${profile.id}&name=${encodeURIComponent(profile.displayName)}`}
            >
              <PenLine className="size-4" />
              Write a letter
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
