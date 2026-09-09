'use client';

import { stateName, type PublicProfileSummary } from '@heartlink/consumer-api';
import { BadgeCheck, Check, ChevronDown, Heart, Images } from 'lucide-react';
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
          <h1 className="flex items-center gap-2.5 font-[family-name:var(--font-bree)] text-[26px] text-ink">
            Liked or Saved Profiles
            <Heart className="size-5 fill-primary text-primary" />
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Profiles you&apos;ve liked or saved for later.
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
        <div className="rounded-card border border-line bg-surface-elevated p-8 text-center">
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
        <div className="rounded-card border border-line bg-surface-elevated p-10 text-center">
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

      {/* Three across on a desktop, as the screens draw it; two, then one, as
          the room runs out. On a phone the designs switch to a compact row,
          which is what the card collapses to below `sm`. */}
      {/* `items-start`: grid items stretch to the tallest in their row by
          default, so one card with a long name padded every other card in the
          row with empty space between the location and the buttons. */}
      <ul className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface-elevated shadow-[0_2px_12px_rgba(22,5,31,0.06)] transition-shadow hover:shadow-[0_14px_30px_rgba(22,5,31,0.14)]">
      <Link href={`/profiles/${profile.id}`} className="relative block aspect-[4/3] shrink-0">
        <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName} />

        {/* Filled heart, top right, as the screens have it — on this page every
            card is already liked, so it is the way to unlike rather than a
            state to read. */}
        <span className="absolute right-3 top-3">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onUnsave();
            }}
            aria-label={`Remove ${profile.displayName} from Liked`}
            className="grid size-9 place-items-center rounded-full bg-white/95 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Heart className="size-[18px] fill-primary text-primary" />
          </button>
        </span>

        {profile.photoCount > 1 ? (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-pill bg-midnight/60 px-2 py-0.5 text-[11px] font-semibold text-sidebar-text">
            <Images className="size-3" />
            {profile.photoCount}
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-bree)] text-[17px] text-ink">
            <span className="truncate">{profile.displayName}</span>
            {profile.age != null ? (
              <span className="shrink-0 text-[15px] text-ink-soft">{profile.age}</span>
            ) : null}
            {/* Same rule as browse and the profile page: shown only when staff
                recorded an identity check. */}
            {profile.isVerified ? (
              <BadgeCheck className="size-4 shrink-0 fill-sidebar text-white" />
            ) : null}
          </h2>

          {place ? <p className="mt-1 text-[12.5px] text-ink-soft">{place}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/profiles/${profile.id}`}>View Profile</Link>
          </Button>
          <Button asChild size="sm">
            <Link
              href={`/mailbox?compose=${profile.id}&name=${encodeURIComponent(profile.displayName)}`}
            >
              Message
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
