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

/**
 * Screens that exist on the website today.
 *
 * The phone app's Account screen links out to a dozen places, and the port is
 * landing them a few at a time. Rather than shipping rows that quietly 404 in
 * between, the settings rows read this list: a destination that is not here
 * renders as "Coming soon" and is not clickable. Adding a screen means adding
 * one line here, so nothing has to be remembered twice.
 */
export const BUILT_ROUTES = new Set<string>([
  '/browse',
  '/mailbox',
  '/liked',
  '/account',
  '/plans',
  '/profiles',
  '/support',
  '/privacy-safety',
  '/policy',
]);

export function isBuilt(href: string): boolean {
  return BUILT_ROUTES.has(href.split('?')[0]);
}
