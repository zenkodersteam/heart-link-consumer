'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Ends the session and returns to sign-in.
 *
 * Needed as its own page because signing out has to happen in the browser:
 * redirecting a stale or unauthorised session straight to `/sign-in` leaves the
 * session intact, so Clerk sees someone signed in and sends them back to the
 * dashboard — which fails again, and loops.
 *
 * The reason is shown rather than left a mystery. Being bounced with no
 * explanation, especially when the account is fine and only its role is wrong,
 * reads as the portal being broken.
 */
const REASONS: Record<string, { title: string; detail: string }> = {
  not_authorized: {
    title: 'This account does not have staff access',
    detail:
      'You signed in successfully, but this account is not set up as a staff member, so the portal has nothing to show you. Ask an administrator to grant your account staff access, then sign in again.',
  },
  session_expired: {
    title: 'Your session has ended',
    detail: 'Sign in again to pick up where you left off.',
  },
};

export function SignOutFlow() {
  const { signOut } = useClerk();
  const params = useSearchParams();
  const reason = params.get('reason') ?? 'session_expired';
  const copy = REASONS[reason] ?? REASONS.session_expired;

  useEffect(() => {
    // Clear the session, then land on sign-in. Without the sign-out the next
    // page would send them straight back here.
    void signOut({ redirectUrl: `/sign-in?reason=${encodeURIComponent(reason)}` });
  }, [signOut, reason]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="font-serif text-2xl text-text">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">{copy.detail}</p>
        <p className="mt-6 text-xs text-text-muted">Signing you out…</p>
      </div>
    </main>
  );
}
