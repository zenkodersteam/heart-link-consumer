import 'server-only';
import { cookies } from 'next/headers';
import { createApiClient, type ApiClient } from '@heartlink/api-client';

import { ACCESS_COOKIE, apiBaseUrl } from '@/lib/session';

/**
 * Build an authenticated API client for use inside Server Components and
 * Server Actions.
 *
 * The token comes from the cookie the proxy refreshed on the way in, so this is
 * a read and never a network call. Throws when there is none: every admin route
 * is already gated by `proxy.ts`, so this firing means a route escaped the
 * matcher, which is worth failing loudly rather than rendering an empty page.
 */
export async function serverApi(): Promise<ApiClient> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) {
    throw new Error('Unauthenticated: no admin session');
  }
  return createApiClient({ baseUrl: apiBaseUrl(), token });
}

/** The signed-in member of staff, or null. Used by the shell and the dashboard. */
export async function currentStaff(): Promise<{
  id: string;
  email: string;
  role: string;
  displayName: string | null;
} | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${apiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
    };
  } catch {
    return null;
  }
}
