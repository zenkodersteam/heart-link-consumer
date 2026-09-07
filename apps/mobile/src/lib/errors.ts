/**
 * User-facing failure copy.
 *
 * `ApiClientError` messages are deliberately verbose for DevTools: they carry
 * the full request URL and hints like "Likely CORS, DNS, or the API is
 * unreachable." That text is diagnostic, not product copy, and it must never
 * reach a member's screen. Every screen that renders a caught error should pass
 * it through `humanError()` first.
 */

import { ApiClientError } from '@heartlink/consumer-api';

/** Anything that reads as plumbing rather than product. */
const TECHNICAL =
  /(https?:\/\/|:\/\/|\bCORS\b|\bDNS\b|\bfetch\b|\bECONN|\bENOTFOUND\b|TypeError|localhost|127\.0\.0\.1|\bHTTP \d{3}\b|\bstack\b|<[a-z!/])/i;

const OFFLINE = "We couldn't reach HeartLink just now. Check your connection and try again.";
const SERVER = 'Something went wrong on our end. Please try again in a moment.';
const SESSION = 'Your session has expired. Sign in again to pick up where you left off.';
/**
 * 403 is not an expired session. The member app is gated to `outside_user`, so
 * a staff/admin account signs in successfully and is then refused by every
 * endpoint. Reporting that as "session expired" sent people to sign in again
 * with the same account, which cannot fix it.
 */
const NOT_A_MEMBER_ACCOUNT =
  'This account cannot use the member app. Sign in with your member account instead.';

/** True when the request never reached the API (offline, blocked, host down). */
export function isOffline(e: unknown): boolean {
  return e instanceof ApiClientError && (e.status === 0 || e.code === 'NETWORK_ERROR');
}

/**
 * Turn any thrown value into a sentence we are happy to show a member.
 *
 * `fallback` is the screen-specific sentence ("Could not load plans.") used
 * whenever the underlying error has nothing safe and useful to add.
 */
export function humanError(e: unknown, fallback: string): string {
  if (isOffline(e)) return OFFLINE;

  if (e instanceof ApiClientError) {
    if (e.status === 401) return SESSION;
    if (e.status === 403) return NOT_A_MEMBER_ACCOUNT;
    if (e.status >= 500) return SERVER;
    // Validation-shaped responses (400/409/422) usually carry a message written
    // for a person. Pass it through only when it reads like one.
    if (e.status === 400 || e.status === 409 || e.status === 422) {
      const msg = e.message?.trim();
      if (msg && msg.length <= 160 && !TECHNICAL.test(msg)) return msg;
    }
    return fallback;
  }

  if (e instanceof Error) {
    const msg = e.message?.trim();
    if (msg && msg.length <= 160 && !TECHNICAL.test(msg)) return msg;
  }
  return fallback;
}
