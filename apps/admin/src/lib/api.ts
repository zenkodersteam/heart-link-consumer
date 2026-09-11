import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createApiClient, type ApiClient } from '@heartlink/api-client';

import { ACCESS_COOKIE, apiBaseUrl } from '@/lib/session';

/**
 * Build an authenticated API client for use inside Server Components and
 * Server Actions.
 *
 * The token comes from the cookie the proxy refreshed on the way in, so this is
 * a read and never a network call.
 *
 * With no token, it sends the member to sign out rather than throwing. It used
 * to throw, on the theory that the proxy made this unreachable — but it was
 * reachable, whenever a refresh failed and the proxy let the request through
 * anyway, and a Server Component that throws in production renders as an
 * opaque "Minified React error #441" on every page. A redirect is the one
 * outcome here that can never become that screen. `/sign-out` rather than
 * `/sign-in`, because the stale cookies have to be cleared first or the proxy
 * sends them straight back here.
 */
export async function serverApi(): Promise<ApiClient> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) redirect('/sign-out?reason=session_expired');
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
