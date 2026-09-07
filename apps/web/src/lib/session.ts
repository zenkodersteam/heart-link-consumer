import 'server-only';

import { cookies } from 'next/headers';

/**
 * Where the refresh token lives on the web.
 *
 * In an httpOnly cookie, which means no script on the page can read it — the
 * point of the exercise, since it is the one token that can mint new sessions
 * and the one an XSS bug would most want. The short-lived access token is kept
 * in memory by the client instead: losing it on a page reload costs one refresh
 * call, and putting it in localStorage would hand the same bug a way in.
 *
 * `lax` rather than `strict`: the cookie has to survive following a link back
 * into the app from an email, which is exactly how someone arrives after
 * getting a code.
 */
export const SESSION_COOKIE = 'hl_session';

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Off in local development, where there is no TLS and the cookie would
    // simply never be stored.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SIXTY_DAYS_SECONDS,
  };
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Whether this visitor looks signed in.
 *
 * Presence of the cookie, not proof of a valid session: the token could have
 * been revoked a second ago and this cannot tell. It is used only to decide
 * where to send someone, and every request that actually returns data is
 * checked properly by the API. Treating it as authorisation would be wrong.
 */
export async function hasSessionCookie(): Promise<boolean> {
  return (await readSessionCookie()) !== null;
}
