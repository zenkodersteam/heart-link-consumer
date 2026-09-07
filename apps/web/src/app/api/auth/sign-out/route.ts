import { NextResponse } from 'next/server';

import { readSessionCookie } from '@/lib/session';

import { apiBaseUrl, clearSession } from '../route-helpers';

/**
 * End the session, here and on the server.
 *
 * The cookie is cleared whatever the API says. Someone who pressed sign out is
 * signed out of this browser even if the call to revoke the token failed.
 */
export async function POST() {
  const refreshToken = await readSessionCookie();

  if (refreshToken) {
    await fetch(`${apiBaseUrl()}/auth/sign-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }

  return clearSession(NextResponse.json({ signedOut: true }));
}

export const dynamic = 'force-dynamic';
