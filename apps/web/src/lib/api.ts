'use client';

import { createApiClient, type ApiClient } from '@heartlink/consumer-api';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useSession } from '@/components/auth/session-provider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Returns a factory that builds a client carrying a fresh access token.
 *
 * A token, not a client, is what goes stale: access tokens last fifteen
 * minutes, so a client captured once starts sending an expired one. The session
 * refreshes ahead of expiry, and asking it per call is what picks that up.
 *
 * The factory identity is stable so effects and query keys that depend on it do
 * not refire on every render.
 */
export function useApiFactory(): () => Promise<ApiClient> {
  const router = useRouter();
  const { getToken, signOut } = useSession();

  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  useEffect(() => {
    getTokenRef.current = getToken;
    signOutRef.current = signOut;
  }, [getToken, signOut]);

  return useCallback(async () => {
    if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
    const token = (await getTokenRef.current()) ?? undefined;
    return createApiClient({
      baseUrl: API_BASE_URL,
      token,
      // The session is over and refreshing could not save it — signed out
      // elsewhere, revoked, or the account is gone. Showing empty screens
      // behind a dead session is worse than saying so.
      onSessionExpired: () => {
        void signOutRef.current();
        router.push('/sign-in');
      },
    });
  }, [router]);
}
