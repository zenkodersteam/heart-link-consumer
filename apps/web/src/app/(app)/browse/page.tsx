'use client';

import type { ListPublicProfilesQuery, PublicProfileSummary, SwipeAction } from '@heartlink/consumer-api';
import { Compass, Heart } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { FilterBar } from '@/components/browse/filter-bar';
import { ProfileDeck } from '@/components/browse/profile-deck';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import {
  usePublicProfile,
  usePublicProfiles,
  useRecordSwipe,
  useSavedProfiles,
  useToggleSaved,
} from '@/lib/queries';

const PAGE_SIZE = 20;

export default function BrowsePage() {
  const [query, setQuery] = useState<ListPublicProfilesQuery>({ limit: PAGE_SIZE, offset: 0 });
  /**
   * Cards actioned in this visit, hidden straight away.
   *
   * The server records the action so the next fetch omits them, but waiting for
   * a refetch would leave the card sitting there after it was swiped. Kept as
   * ids rather than by splicing the list, so a background refetch cannot
   * resurrect one.
   */
  const [dismissed, setDismissed] = useState<string[]>([]);
  /**
   * Which card is on top.
   *
   * Browsing moves this; passing and liking remove a profile from `deck`
   * instead, and whoever was behind takes the same position. Kept here rather
   * than in the deck because this page also reads the top card — for its
   * release date and the "view full profile" link — and two places deciding
   * what is on top is how they end up disagreeing.
   */
  const [cursor, setCursor] = useState(0);

  const { data, isPending, isError, error, refetch } = usePublicProfiles(query);
  const { data: saved } = useSavedProfiles();
  const toggleSaved = useToggleSaved();
  const recordSwipe = useRecordSwipe();

  const savedIds = useMemo(() => new Set((saved?.items ?? []).map((p) => p.id)), [saved]);
  const deck = useMemo(
    () => (data?.items ?? []).filter((profile) => !dismissed.includes(profile.id)),
    [data, dismissed],
  );

  // Passing the last card, or a refetch shrinking the deck, can leave the
  // cursor pointing past the end. Clamped on read rather than corrected in an
  // effect: the effect would set state during render and re-run the tree for a
  // value that can simply be worked out here.
  const index = Math.min(cursor, Math.max(0, deck.length - 1));
  const current = deck[index];

  // Only the detail carries a release date, and only the card on top shows one.
  const { data: topDetail } = usePublicProfile(current?.id);

  const hasFilters = Boolean(query.state || query.gender || query.ageMin || query.ageMax);
  const reset = () => setQuery({ limit: PAGE_SIZE, offset: 0 });

  function onAction(profile: PublicProfileSummary, action: SwipeAction) {
    setDismissed((ids) => [...ids, profile.id]);
    recordSwipe.mutate({ id: profile.id, action });

    // Liking saves. The heart on the card was the only thing that did, so the
    // Like button recorded a swipe, dismissed the card, and left nothing in
    // Liked - from the outside indistinguishable from Pass. Guarded on the
    // current state so liking someone already saved is not a second write.
    if (action === 'like' && !savedIds.has(profile.id)) {
      toggleSaved.mutate({ id: profile.id, saved: false });
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-5 py-7">
      <h1 className="flex items-center justify-center gap-2 text-center font-[family-name:var(--font-bree)] text-[26px] text-ink">
        Discover meaningful connections
        <Heart className="size-5 text-gold" />
      </h1>

      <div className="mt-5">
        <FilterBar query={query} onChange={setQuery} onReset={reset} />
      </div>

      {isPending ? <PageSpinner label="Finding people…" /> : null}

      {isError ? (
        <div className="mt-8 rounded-card border border-line bg-surface-elevated p-8 text-center">
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

      {!isPending && !isError && deck.length === 0 ? (
        <div className="mt-8 rounded-card border border-line bg-surface-elevated p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold bg-gold-faint">
            <Compass className="size-7 text-gold" />
          </span>
          <p className="mt-5 font-[family-name:var(--font-bree)] text-xl text-ink">
            {hasFilters ? 'No matches for these filters' : "You're all caught up"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            {hasFilters
              ? 'Try widening your age, location or gender filters to see more people.'
              : 'You have seen everyone for now. New profiles are added as they clear review.'}
          </p>
          <Button
            className="mt-5"
            variant="secondary"
            onClick={() => (hasFilters ? reset() : void refetch())}
          >
            {hasFilters ? 'Reset filters' : 'Refresh'}
          </Button>
        </div>
      ) : null}

      {deck.length > 0 ? (
        <>
          <div className="mt-6">
            <ProfileDeck
              profiles={deck}
              releaseDate={topDetail?.releaseDate}
              index={index}
              // Stepped from the clamped index, not the raw cursor, or a
              // cursor left past the end would need several presses to appear
              // to move at all.
              onBrowse={(delta) =>
                setCursor(Math.min(Math.max(index + delta, 0), deck.length - 1))
              }
              onAction={onAction}
            />
          </div>

          <p className="mt-6 text-center text-[13px] text-ink-soft">
            <Link href={`/profiles/${current.id}`} className="font-semibold text-primary hover:underline">
              View {current.displayName}&apos;s full profile
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
