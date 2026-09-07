import { cookies } from 'next/headers';

import { ACCESS_COOKIE } from '@/lib/session';

/**
 * The access token for a Route Handler.
 *
 * The proxy has already refreshed it on the way in, so this is a cookie read
 * rather than a network call.
 */
export async function routeAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}
