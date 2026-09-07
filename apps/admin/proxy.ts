import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Gate every admin route at the edge.
 *
 * Previously nothing guarded these paths up front: the dashboard shell
 * rendered, called the API, and only bounced once a request came back
 * unauthorised. That means a signed-out visitor could load admin chrome and
 * fire requests before being turned away, and every page had to remember to
 * handle the failure itself.
 *
 * Matching by exception keeps that from rotting — a new route is protected by
 * default, rather than protected only if someone remembers to add it.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention, and
 * the old file name now builds with a deprecation warning.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, which never need auth
    // and would only add latency.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
