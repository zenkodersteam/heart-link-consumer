import { useCallback, useEffect, useRef } from 'react';

import { createApiClient, type ApiClient } from '@heartlink/consumer-api';
import { resetToWelcome } from '../navigations/navigationRef';
import { clearMyProfileCache } from './use-my-profile';
import { useSession } from './session';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Returns a factory that builds an ApiClient carrying a fresh access token.
 *
 * A token, not a client, is what goes stale: access tokens last fifteen
 * minutes, so a client captured once starts sending an expired one. The session
 * refreshes ahead of expiry, and asking it per call is what picks that up.
 *
 * The returned function has a STABLE identity for the life of the component.
 * Any effect that depends on the factory (the Liked screen's load, for one)
 * would otherwise re-fire on every render and spin into a request loop.
 */
export function useApiClientFactory(): () => Promise<ApiClient> {
  const { getToken, signOut } = useSession();

  const getTokenRef = useRef(getToken);
  const signOutRef = useRef(signOut);
  useEffect(() => {
    getTokenRef.current = getToken;
    signOutRef.current = signOut;
  }, [getToken, signOut]);

  // One sign-out per expiry, not one per in-flight request: a screen that
  // fires several calls at once would otherwise stack redirects.
  const expiring = useRef(false);

  const onSessionExpired = useCallback(() => {
    if (expiring.current) return;
    expiring.current = true;
    void (async () => {
      try {
        await signOutRef.current();
      } catch {
        // Sign-out is best effort; we leave regardless so no stale screen shows.
      } finally {
        clearMyProfileCache();
        // Straight out, with nothing of the expired session behind it. The
        // root stack watches the session too, but this runs from a request
        // that has already failed — waiting for a re-render would leave the
        // dead screen up while it happened.
        resetToWelcome();
        expiring.current = false;
      }
    })();
  }, []);

  return useCallback(async () => {
    if (!API_BASE_URL) {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
    }
    const token = (await getTokenRef.current()) ?? undefined;
    return createApiClient({ baseUrl: API_BASE_URL, token, onSessionExpired });
  }, [onSessionExpired]);
}
