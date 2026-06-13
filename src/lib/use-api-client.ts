import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useRef } from 'react';

import { createApiClient, type ApiClient } from './api';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://heart-link-api.up.railway.app';

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
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useCallback(async () => {
    const token = (await getTokenRef.current()) ?? undefined;
    return createApiClient({ baseUrl: API_BASE_URL, token });
  }, []);
}
