import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

// `/sign-out` must be public: it is where an unauthorised or expired session is
// sent to be cleared, and requiring auth to reach it would be circular.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out(.*)',
]);

/**
 * HTTP Basic Auth gate - runs before Clerk. Blocks the entire admin-web app
 * behind a shared username/password so the URL isn't publicly accessible
 * even to people who would otherwise see the Clerk sign-in page.
 *
 * Controlled by `ADMIN_BASIC_AUTH_USER` and `ADMIN_BASIC_AUTH_PASS` env vars.
 * If either is unset, the gate is disabled (useful for local dev).
 *
 * This is a coarse "don't let strangers reach the login form" layer. Per-user
 * authentication is still Clerk's job downstream.
 */
function basicAuthGate(req: NextRequest): NextResponse | null {
  const user = process.env.ADMIN_BASIC_AUTH_USER;
  const pass = process.env.ADMIN_BASIC_AUTH_PASS;

  // Env vars not configured → gate disabled. Convenient for localhost.
  if (!user || !pass) return null;

  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(':');
      if (sep > -1) {
        const providedUser = decoded.slice(0, sep);
        const providedPass = decoded.slice(sep + 1);
        // Constant-time-ish compare by comparing lengths first.
        if (
          providedUser.length === user.length &&
          providedPass.length === pass.length &&
          providedUser === user &&
          providedPass === pass
        ) {
          return null;
        }
      }
    } catch {
      /* fall through to challenge */
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="HeartLink Admin", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const gate = basicAuthGate(request);
    if (gate) return gate;

    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
