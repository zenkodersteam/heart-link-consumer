/**
 * Which routes are reachable signed out.
 *
 * One list, read by the middleware. Everything absent from it is protected, so
 * a screen added later is private by default rather than public until someone
 * remembers to add it.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/policy(.*)',
  '/api/health(.*)',
] as const;

/** Where a signed-in member lands, and where they return to after signing in. */
export const AFTER_SIGN_IN = '/browse';

/** New accounts finish their profile before anything else expects one. */
export const AFTER_SIGN_UP = '/onboarding';
