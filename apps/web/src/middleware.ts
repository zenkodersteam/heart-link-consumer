import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { PUBLIC_ROUTES, AFTER_SIGN_IN } from '@/lib/routes';

const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTES]);
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // Someone already signed in has no use for the sign-in form; without this
  // they can land back on it from a stale tab or a bookmarked link and be left
  // wondering whether they are signed in at all.
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL(AFTER_SIGN_IN, request.url));
  }

  if (!isPublicRoute(request)) {
    // `redirectUrl` is what returns them to the page they actually wanted
    // after signing in, rather than dumping everyone on the same screen.
    await auth.protect({
      unauthenticatedUrl: new URL(
        `/sign-in?redirect_url=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`,
        request.url,
      ).toString(),
    });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except Next internals and static assets, which never need a
    // session and would only pay the latency.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
