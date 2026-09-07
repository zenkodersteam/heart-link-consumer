import { NextResponse } from 'next/server';

import { readSessionCookie } from '@/lib/session';

import { apiBaseUrl, clearSession, respondWithSession } from '../route-helpers';

/**
 * Mint a new access token from the cookie.
 *
 * A failure here means the session is genuinely over — expired, signed out
 * elsewhere, or revoked because the token was replayed — so the cookie is
 * cleared rather than left to fail the same way on every subsequent page.
 */
export async function POST(request: Request) {
  const refreshToken = await readSessionCookie();
  if (!refreshToken) {
    return NextResponse.json({ message: 'No session' }, { status: 401 });
  }

  const response = await fetch(`${apiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-agent': request.headers.get('user-agent') ?? '',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return clearSession(
      NextResponse.json({ message: 'Your session has ended.' }, { status: 401 }),
    );
  }

  // Rotated on every use: the cookie is replaced with the token issued in its
  // place, so the one that just went over the wire is already dead.
  return respondWithSession(await response.json());
}

export const dynamic = 'force-dynamic';
