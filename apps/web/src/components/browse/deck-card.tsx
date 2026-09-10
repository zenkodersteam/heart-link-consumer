'use client';

import { formatReleaseMonth, stateName, type PublicProfileSummary } from '@heartlink/consumer-api';
import { BadgeCheck, Calendar, Landmark, Mail } from 'lucide-react';

import { ProfilePhoto } from '@/components/profiles/profile-photo';

/**
 * One card in the deck: photo above, details below, as the client screens draw
 * it.
 *
 * The rows underneath are only rendered when the API has something to put in
 * them. A card with an empty "Release:" line reads as broken, and these
 * profiles come from scanned paper applications where any given field may
 * simply not have been filled in.
 */
export function DeckCard({ profile, releaseDate }: {
  profile: PublicProfileSummary;
  /**
   * Only the detail endpoint carries a release date, so the deck fetches it for
   * the card on top and leaves the ones behind without. The row is hidden
   * rather than blank when it is missing.
   */
  releaseDate?: string | null;
}) {
  const place = stateName(profile.facility?.state);
  const release = releaseDate ? formatReleaseMonth(releaseDate) : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[20px] bg-surface-elevated shadow-[0_18px_40px_rgba(46,18,64,0.16)]">
      <div className="relative aspect-[4/3] shrink-0">
        <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName} />

        {profile.isVerified ? (
          <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink shadow-sm">
            <BadgeCheck className="size-3.5 text-sidebar" />
            Verified Profile
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-4">
        {/* `leading-none` cropped the descenders — the tail of a "y" was cut off
            along the bottom. A serif face needs room under the baseline, and
            nothing here depends on the line box being exactly the cap height. */}
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-bree)] text-[22px] leading-[1.25] text-ink">
          <span className="truncate py-0.5">{profile.displayName}</span>
          {profile.age != null ? (
            <span className="shrink-0 text-[17px] text-ink-soft">{profile.age}</span>
          ) : null}
          {profile.isVerified ? (
            <BadgeCheck className="size-[18px] shrink-0 fill-sidebar text-white" />
          ) : null}
        </h2>

        {place ? (
          <p className="flex items-center gap-2 text-[13px] text-ink-soft">
            <Landmark className="size-3.5 shrink-0 text-ink-faint" />
            <span className="truncate">{place}</span>
          </p>
        ) : null}

        {profile.bioExcerpt ? (
          <p className="flex items-start gap-2 text-[13px] leading-[1.5] text-ink-soft">
            <Mail className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
            <span className="line-clamp-2">{profile.bioExcerpt}</span>
          </p>
        ) : null}

        {release ? (
          <p className="flex items-center gap-2 text-[13px] text-ink-soft">
            <Calendar className="size-3.5 shrink-0 text-ink-faint" />
            Release: {release}
          </p>
        ) : null}
      </div>
    </article>
  );
}
