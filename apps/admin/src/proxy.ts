import { NextResponse, type NextRequest } from 'next/server';

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  accessTokenExpiryMs,
  apiBaseUrl,
  refreshCookieOptions,
} from '@/lib/session';

// `/sign-out` must be public: it is where an unauthorised or expired session is
// sent to be cleared, and requiring auth to reach it would be circular.
const PUBLIC_PATHS = /^\/(sign-in|sign-out)(\/.*)?$/;

/** Refresh a minute early, so a page never renders with a token about to die. */
const REFRESH_MARGIN_MS = 60 * 1000;

function signInRedirect(request: NextRequest): NextResponse {
  const url = new URL('/sign-in', request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== '/') url.searchParams.set('redirect_url', `${pathname}${search}`);
  const response = NextResponse.redirect(url);
  // Clear both, or the next request tries the same dead session again.
  response.cookies.set(ACCESS_COOKIE, '', { ...refreshCookieOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...refreshCookieOptions(), maxAge: 0 });
  return response;
}

/**
 * Gate every admin route at the edge, and keep the access token fresh.
 *
 * Refreshing happens here because it is the last place before a page renders
 * that can still write a cookie. A server component can read one but not set
 * one, so if the token were left to expire mid-render the page would have no
 * way to obtain a new one and would simply fail.
 *
 * Matching by exception keeps that from rotting — a new route is protected by
 * default, rather than protected only if someone remembers to add it.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The auth endpoints are how a session is made, so they cannot require one.
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  const isPublic = pathname === '/' || PUBLIC_PATHS.test(pathname);
  if (isPublic) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return signInRedirect(request);

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && Date.now() < accessTokenExpiryMs(accessToken) - REFRESH_MARGIN_MS) {
    return NextResponse.next();
  }

  let refreshed: Response;
  try {
    refreshed = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    // The API is unreachable. Signing someone out over a blip would be wrong,
    // so the request continues and the page shows its own error state.
    return NextResponse.next();
  }

  if (!refreshed.ok) return signInRedirect(request);

  const tokens = (await refreshed.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };

  const response = NextResponse.next({
    // The page renders in this same pass, before the browser has the new
    // cookie — so the fresh token is put on the request too, not just the
    // response, or this first render would still read the expired one.
    request: {
      headers: new Headers([
        ...request.headers.entries(),
        ['cookie', `${ACCESS_COOKIE}=${tokens.accessToken}; ${REFRESH_COOKIE}=${tokens.refreshToken}`],
      ]),
    },
  });
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions(tokens.expiresIn));
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
