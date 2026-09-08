'use client';

import type { ListPublicProfilesQuery, PublicProfileSummary, SwipeAction } from '@heartlink/consumer-api';
import { Compass, Heart } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  const [lastPassed, setLastPassed] = useState<PublicProfileSummary | null>(null);

  const { data, isPending, isError, error, refetch } = usePublicProfiles(query);
  const { data: saved } = useSavedProfiles();
  const toggleSaved = useToggleSaved();
  const recordSwipe = useRecordSwipe();

  const savedIds = useMemo(() => new Set((saved?.items ?? []).map((p) => p.id)), [saved]);
  const deck = useMemo(
    () => (data?.items ?? []).filter((profile) => !dismissed.includes(profile.id)),
    [data, dismissed],
  );

  // Only the detail carries a release date, and only the card on top shows one.
  const { data: topDetail } = usePublicProfile(deck[0]?.id);

  const hasFilters = Boolean(query.state || query.gender || query.ageMin || query.ageMax);
  const reset = () => setQuery({ limit: PAGE_SIZE, offset: 0 });

  function onAction(profile: PublicProfileSummary, action: SwipeAction) {
    if (action === 'second_look') {
      // Brings back the last person passed. The server drops the row, so they
      // return on the next fetch on every device rather than only this one.
      const returning = lastPassed;
      if (!returning) return;
      recordSwipe.mutate({ id: returning.id, action });
      setDismissed((ids) => ids.filter((id) => id !== returning.id));
      setLastPassed(null);
      toast.success("He's back!", { description: `You'll see ${returning.displayName} again.` });
      return;
    }

    setDismissed((ids) => [...ids, profile.id]);
    recordSwipe.mutate({ id: profile.id, action });

    if (action === 'like') {
      if (!savedIds.has(profile.id)) toggleSaved.mutate({ id: profile.id, saved: false });
      setLastPassed(null);
    } else {
      setLastPassed(profile);
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
              savedIds={savedIds}
              canSecondLook={Boolean(lastPassed)}
              onAction={onAction}
              onToggleSave={(profile) =>
                toggleSaved.mutate({ id: profile.id, saved: savedIds.has(profile.id) })
              }
            />
          </div>

          <p className="mt-6 text-center text-[13px] text-ink-soft">
            <Link href={`/profiles/${deck[0].id}`} className="font-semibold text-primary hover:underline">
              View {deck[0].displayName}&apos;s full profile
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
