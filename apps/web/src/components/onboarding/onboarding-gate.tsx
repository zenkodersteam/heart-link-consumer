'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PageSpinner } from '@/components/ui/spinner';
import { useMyProfile } from '@/lib/queries';

/**
 * Sends anyone whose profile is unfinished back to finish it.
 *
 * It lives in the signed-in layout rather than on the sign-in screens because
 * there is more than one way in — a password, a code, a reset, a bookmarked
 * link, a session restored days later — and the redirect was only on one of
 * them. Anyone arriving by any other route walked straight into the app with
 * an empty profile. Gating the shell instead of each entrance means a new way
 * in cannot miss it.
 *
 * The phone app gates its tab layout the same way, for the same reason.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: profile, isPending, isError } = useMyProfile();

  // `onboardingComplete` and not the status: editing a profile puts it back to
  // draft, and keying on that sent members through onboarding again every time
  // they changed a detail.
  const unfinished = !isPending && !isError && !profile?.onboardingComplete;

  useEffect(() => {
    if (unfinished) router.replace('/onboarding');
  }, [unfinished, router]);

  // Held rather than rendered: showing the app for the moment before the
  // redirect lands is how someone sees a screen they are not meant to have.
  //
  // This now holds the whole shell, so it fills the window rather than sitting
  // in a content area with navigation drawn around it — the navigation is
  // exactly what should not be on screen yet.
  if (isPending || unfinished) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <PageSpinner label="Getting your profile…" />
      </div>
    );
  }

  // Deliberately not gated on a failure to load. The profile is fetched over
  // the network, and a blip is not evidence that onboarding is unfinished —
  // treating it as such would lock people out of the app they have already
  // finished setting up. The screens below handle their own load failures.
  return <>{children}</>;
}
