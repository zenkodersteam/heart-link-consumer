import { NextResponse, type NextRequest } from 'next/server';

import { AFTER_SIGN_IN, PUBLIC_ROUTES } from '@/lib/routes';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * The edge gate for every request.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention, and
 * the old file name now builds with a deprecation warning.
 *
 * What it checks is the presence of the session cookie, not its validity — the
 * cookie is httpOnly and opaque here, and verifying it would mean a network
 * call on every navigation. That is enough for its actual job, which is sending
 * people to the right screen. Authorisation happens where it belongs: the API
 * verifies every request, and a revoked session gets nothing back but a 401
 * that signs the browser out.
 *
 * Routes are protected by exception, so a screen added later is behind the
 * sign-in wall by default instead of only if someone remembered to list it.
 */
const PUBLIC_PATTERNS = PUBLIC_ROUTES.map(
  (route) => new RegExp(`^${route.replace(/\(\.\*\)/g, '.*').replace(/\/$/, '')}\/?$`),
);

function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname));
}

const AUTH_ROUTES = /^\/(sign-in|sign-up)(\/.*)?$/;

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);

  // Someone already signed in has no use for the sign-in form; without this
  // they can land back on it from a stale tab or a bookmarked link and be left
  // wondering whether they are signed in at all.
  if (signedIn && AUTH_ROUTES.test(pathname)) {
    return NextResponse.redirect(new URL(AFTER_SIGN_IN, request.url));
  }

  if (!signedIn && !isPublic(pathname)) {
    // `redirect_url` is what returns them to the page they actually wanted
    // after signing in, rather than dumping everyone on the same screen.
    const signIn = new URL('/sign-in', request.url);
    signIn.searchParams.set('redirect_url', `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, the auth routes themselves, and static
    // assets — none of which need a session, and which would only pay the
    // latency. The auth API is excluded because it is how a session is made.
    '/((?!_next|api/auth|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
