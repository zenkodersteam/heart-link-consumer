import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Signed-out visitors get the marketing page and the auth screens; everything
 * else needs a session.
 *
 * Matching by exception rather than listing protected routes: a screen added
 * later is private by default, instead of being public until somebody
 * remembers to add it here.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static assets — they never need auth and the
    // check would only add latency.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
