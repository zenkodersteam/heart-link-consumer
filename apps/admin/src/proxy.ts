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

/** Only `/sign-in`; `/sign-out` has to stay reachable while signed in. */
const SIGN_IN_PATH = /^\/sign-in(\/.*)?$/;

/**
 * Where a `redirect_url` may actually send someone.
 *
 * Only a path on this site: it must start with a single slash and no scheme.
 * `//evil.example` and `https://evil.example` are both browser-valid redirect
 * targets, so a param copied straight into a redirect is an open redirect.
 */
function safeRedirect(target: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith('/') || target.startsWith('//')) return null;
  return target;
}

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

  // Someone who already has a session has no use for the sign-in form. Without
  // this, following a bounced link like `/sign-in?redirect_url=/settings` after
  // signing in elsewhere showed the login form again, with no way through but
  // to type a password that was not needed.
  if (isPublic && SIGN_IN_PATH.test(pathname) && request.cookies.get(REFRESH_COOKIE)?.value) {
    const wanted = safeRedirect(request.nextUrl.searchParams.get('redirect_url'));
    return NextResponse.redirect(new URL(wanted ?? '/dashboard', request.url));
  }

  if (isPublic) return NextResponse.next();

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return signInRedirect(request);

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const accessExpiry = accessToken ? accessTokenExpiryMs(accessToken) : 0;
  if (accessToken && Date.now() < accessExpiry - REFRESH_MARGIN_MS) {
    return NextResponse.next();
  }

  // A prefetch never refreshes. The router fires one for every link on
  // screen, all at once, and each used to trigger its own refresh — a burst
  // that tripped the API's rate limit on /auth/refresh (which every admin
  // shares, since the calls leave from Vercel's addresses). The navigation
  // that follows a prefetch will refresh; the prefetch itself just yields.
  if (isPrefetch(request)) {
    return accessToken && Date.now() < accessExpiry ? NextResponse.next() : NO_CONTENT();
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
    return couldNotRefresh(request, accessToken, accessExpiry);
  }

  // Only the API actually rejecting the session ends it. A 500 or a 502 from
  // a deploy rolling over is not evidence that anyone is signed out, and
  // clearing the cookies over one threw people back to the sign-in form
  // mid-task for something that had already fixed itself.
  if (refreshed.status === 401 || refreshed.status === 403) return signInRedirect(request);
  if (!refreshed.ok) return couldNotRefresh(request, accessToken, accessExpiry);

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

function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('sec-purpose')?.includes('prefetch') === true
  );
}

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

/**
 * The refresh failed for a reason that is not "this session is over": the API
 * was unreachable, rate-limited, or mid-deploy.
 *
 * This used to wave the request through regardless, and that is what put
 * "Minified React error #441" on every admin page. With no usable access
 * token, the page's server components call `serverApi()`, which throws, and
 * a Server Component that throws in production renders as that error —
 * repeatedly, since each retry hit the same wall. Letting a request through
 * is only honest when it still has a token to render with.
 *
 * So: if the token is merely inside the refresh margin — still valid, just
 * close to expiry — use it. Otherwise say plainly that the server could not
 * be reached and try again on its own in a few seconds. No sign-out: the
 * refresh cookie is untouched, so the retry picks up exactly where this left
 * off.
 */
function couldNotRefresh(
  request: NextRequest,
  accessToken: string | undefined,
  accessExpiry: number,
): NextResponse {
  if (accessToken && Date.now() < accessExpiry) return NextResponse.next();
  if (isPrefetch(request)) return NO_CONTENT();

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="4">
<title>Reconnecting · HeartLink</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FDF9F6;
    font:15px/1.5 system-ui,-apple-system,sans-serif;color:#2E1240}
  main{max-width:360px;padding:32px;text-align:center}
  h1{font-size:18px;margin:0 0 8px}
  p{margin:0;color:#6E5C80}
  .dot{display:inline-block;width:8px;height:8px;margin:18px 3px 0;border-radius:50%;
    background:#D81B60;animation:b 1.2s infinite ease-in-out}
  .dot:nth-child(2){animation-delay:.15s}.dot:nth-child(3){animation-delay:.3s}
  @keyframes b{0%,80%,100%{opacity:.25}40%{opacity:1}}
</style></head><body><main>
<h1>Reconnecting to HeartLink</h1>
<p>We couldn't reach the server for a moment. This page will retry on its own &mdash; you're still signed in.</p>
<div><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
</main></body></html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '4',
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
