import { redirect } from 'next/navigation';
import { ApiClientError } from '@heartlink/api-client';

/**
 * Whether an error means "we do not accept who you are", as opposed to
 * something being broken.
 *
 * 401 is an expired or missing session. 403 is a session the API recognises but
 * will not serve — on this portal that means the account is not staff, which is
 * the one people actually hit: signing in with a member account produced
 * "Role 'outside_user' is not authorized for this resource" thrown raw onto the
 * screen, with no way forward except clearing cookies by hand.
 */
export function isAuthFailure(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError && (err.statusCode === 401 || err.statusCode === 403);
}

/**
 * Send someone whose session will not be served to be signed out.
 *
 * Never returns — `redirect` throws. Call it from a server component, and let
 * the throw travel: a `catch` that swallows everything will also swallow this.
 */
export function redirectToSignOut(err: ApiClientError): never {
  redirect(`/sign-out?reason=${err.statusCode === 403 ? 'not_authorized' : 'session_expired'}`);
}
