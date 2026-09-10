'use client';

import { CheckCircle2, Gift, Info, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { ProfilePhoto } from '@/components/profiles/profile-photo';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { usePublicProfile } from '@/lib/queries';

/**
 * Sponsor flow: a member pays for an incarcerated member's listing.
 *
 * Reached from a profile's "Sponsor their membership" link or a mailed invite,
 * always carrying the profile it is for. Choosing and paying happens on
 * `/plans?profile=…`, which already knows how to show the sponsor plan set and
 * to send Stripe back here — so this screen's job is to say plainly who the
 * gift is for before anyone reaches a card form.
 */
export function Sponsor() {
  const params = useSearchParams();
  const profileId = params.get('profile');
  const checkoutState = params.get('checkout');

  const { data: profile, isPending, isError } = usePublicProfile(profileId ?? undefined);

  if (!profileId) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface-elevated p-10 text-center">
          <span className="grid size-16 place-items-center rounded-full border border-gold bg-gold-faint">
            <Gift className="size-7 text-gold" aria-hidden />
          </span>
          <h1 className="font-[family-name:var(--font-bree)] text-2xl text-ink">
            Sponsor a member
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            Sponsorship keeps someone&apos;s HeartLink profile visible and their mailbox open for
            real correspondence. Start from a profile so we can connect the gift to the right
            person.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/browse">Browse profiles</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/support">Visit support</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const firstName = profile?.displayName?.split(' ')[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      {checkoutState === 'success' ? (
        <div
          className="mb-6 flex items-start gap-3 rounded-[14px] border border-success/40 bg-success/[0.07] p-4"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-success" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-soft">
            Thank you. Your sponsorship is processing, the membership activates as soon as the
            payment settles.
          </p>
        </div>
      ) : null}

      {checkoutState === 'cancel' ? (
        <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-line bg-surface-elevated p-4">
          <Info className="mt-0.5 size-[18px] shrink-0 text-ink-soft" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-soft">
            Checkout was cancelled. No charge was made.
          </p>
        </div>
      ) : null}

      {isPending ? <PageSpinner label="Loading profile…" /> : null}

      {isError ? (
        <p className="text-sm text-ink-soft">We couldn&apos;t load this profile just now.</p>
      ) : null}

      {profile ? (
        <>
          <section className="flex items-center gap-4 rounded-[24px] border border-line bg-surface-elevated p-4 shadow-[0_1px_2px_rgba(46,18,64,0.05),0_8px_18px_rgba(46,18,64,0.06)]">
            <span className="size-16 shrink-0 overflow-hidden rounded-full bg-surface-muted">
              {profile.primaryPhotoUrl ? (
                <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName} sizes="160px" />
              ) : (
                <span className="grid size-full place-items-center">
                  <User className="size-6 text-ink-faint" aria-hidden />
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold tracking-[0.1em] text-gold">
                YOU&apos;RE SPONSORING
              </p>
              <h1 className="truncate font-[family-name:var(--font-bree)] text-[22px] text-ink">
                {profile.displayName}
              </h1>
              <p className="text-[13px] text-ink-faint">
                {profile.age ? `${profile.age} · ` : ''}
                {profile.facility?.state}
              </p>
            </div>

            <Gift className="size-[22px] shrink-0 text-gold" aria-hidden />
          </section>

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            A membership keeps {firstName ?? 'their'} profile visible and their mailbox open. You
            pay; they connect. You can sponsor with a free account, no plan of your own required.
          </p>

          <Button asChild className="mt-6 w-full sm:w-auto">
            <Link href={`/plans?profile=${profileId}`}>Choose a sponsorship</Link>
          </Button>
        </>
      ) : null}
    </div>
  );
}
