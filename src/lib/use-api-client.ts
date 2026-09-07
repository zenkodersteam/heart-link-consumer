import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';

import { createApiClient, type ApiClient } from './api';
import { clearMyProfileCache } from './use-my-profile';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Returns a factory that builds an ApiClient with a fresh Clerk session token.
 *
 * Clerk tokens are short-lived (~60s). Callers should invoke this on every
 * request rather than caching the returned client across renders.
 *
 * The returned function has a STABLE identity for the life of the component.
 * `@clerk/clerk-expo`'s `getToken` reference changes on every render, so we read
 * it through a ref rather than listing it as a useCallback dependency. Without
 * this, any effect that depends on the factory (e.g. the Liked screen's load)
 * re-fires on every render and spins into an infinite request loop.
 */
export function useApiClientFactory(): () => Promise<ApiClient> {
  const { getToken, signOut } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
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
        router.replace('/(auth)/sign-in');
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
