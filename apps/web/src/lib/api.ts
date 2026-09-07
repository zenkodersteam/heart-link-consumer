'use client';

import { useAuth } from '@clerk/nextjs';
import { createApiClient, type ApiClient } from '@heartlink/consumer-api';
import { useCallback, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Returns a factory that builds a client carrying a fresh Clerk token.
 *
 * A token, not a client, is what goes stale: Clerk's are good for about a
 * minute, so a client captured once starts sending an expired one. The factory
 * identity is stable so effects and query keys that depend on it do not refire
 * on every render.
 */
export function useApiFactory(): () => Promise<ApiClient> {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  return useCallback(async () => {
    if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
    const token = (await getTokenRef.current()) ?? undefined;
    return createApiClient({ baseUrl: API_BASE_URL, token });
  }, []);
}
