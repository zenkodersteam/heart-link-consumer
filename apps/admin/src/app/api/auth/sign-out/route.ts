import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ACCESS_COOKIE, REFRESH_COOKIE, apiBaseUrl, refreshCookieOptions } from '@/lib/session';

/**
 * End the session, here and on the server.
 *
 * Both cookies are cleared whatever the API says: someone who pressed sign out
 * is signed out of this browser even if revoking the token failed.
 */
export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${apiBaseUrl()}/auth/sign-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ signedOut: true });
  const cleared = { ...refreshCookieOptions(), maxAge: 0 };
  response.cookies.set(ACCESS_COOKIE, '', cleared);
  response.cookies.set(REFRESH_COOKIE, '', cleared);
  return response;
}

export const dynamic = 'force-dynamic';
