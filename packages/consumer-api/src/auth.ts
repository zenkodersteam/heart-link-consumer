/**
 * Signing in, without a third party.
 *
 * A code is emailed, exchanged for a pair of tokens, and the pair is kept alive
 * by refreshing. The access token is short-lived and carried as a Bearer header
 * on every request; the refresh token is long-lived and is the only thing that
 * can be revoked, so it is treated as the more dangerous of the two and stored
 * accordingly by each app — an httpOnly cookie on the web, the keychain on a
 * phone.
 *
 * These calls take no session of their own, which is why they live apart from
 * the main client: they are how a session is obtained in the first place.
 */

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires, so a client can refresh ahead of it. */
  expiresIn: number;
}

export type AuthUserRole = 'outside_user' | 'admin' | 'ops_staff' | 'moderator' | 'billing';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthUserRole;
  displayName: string | null;
  avatarUrl: string | null;
  onboardingStatus: string;
}

export interface SignInResult extends SessionTokens {
  user: AuthUser;
  /** True when this code created the account rather than opening an existing one. */
  created: boolean;
}

export interface RequestCodeResult {
  sent: true;
  expiresInMinutes: number;
}

export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function normaliseBaseUrl(baseUrl: string): string {
  let url = baseUrl.replace(/\/$/, '');
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

async function post<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${normaliseBaseUrl(baseUrl)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    throw new AuthError(
      0,
      `We could not reach HeartLink. Check your connection and try again. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  const payload: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    // The API's own wording is used as-is: it is deliberately vague about
    // whether a code was wrong, expired or never existed, and rewriting it
    // here would risk saying more than the API chose to.
    const message =
      (payload as { message?: string } | null)?.message ??
      'Something went wrong. Please try again.';
    throw new AuthError(res.status, message);
  }

  return payload as T;
}

/** `post`, with a bearer token. Only set-password needs one. */
async function postAuthed<T>(
  baseUrl: string,
  path: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${normaliseBaseUrl(baseUrl)}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    throw new AuthError(
      0,
      `We could not reach HeartLink. Check your connection and try again. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (payload as { message?: string } | null)?.message ??
      'Something went wrong. Please try again.';
    throw new AuthError(res.status, message);
  }
  return payload as T;
}

/**
 * Ask for a code.
 *
 * The address is the only input. Which email arrives — welcome, confirm your
 * address, or here is your sign-in code — and whether an account is created are
 * both decided by the server from what it holds, so landing on the wrong form
 * still gets you to the right place.
 */
export function requestSignInCode(
  baseUrl: string,
  input: { email: string },
): Promise<RequestCodeResult> {
  return post<RequestCodeResult>(baseUrl, '/auth/otp/request', input);
}

export function verifySignInCode(
  baseUrl: string,
  input: { email: string; code: string },
): Promise<SignInResult> {
  return post<SignInResult>(baseUrl, '/auth/otp/verify', input);
}

/**
 * Sign in with an email address and a password.
 *
 * Unlike the code path this never creates an account — a password proves
 * nothing until someone has set one. The server answers identically for a wrong
 * password, an unknown address and an account with no password yet, so the
 * message here is passed through unchanged rather than guessed at.
 */
export function signInWithPassword(
  baseUrl: string,
  input: { email: string; password: string },
): Promise<SignInResult> {
  return post<SignInResult>(baseUrl, '/auth/password/sign-in', input);
}

/**
 * Choose or change the password on the signed-in account.
 *
 * Needs a live session, which is why the access token is passed explicitly:
 * members who predate passwords reach this straight after signing in with a
 * code.
 */
export async function setAccountPassword(
  baseUrl: string,
  accessToken: string,
  input: { password: string },
): Promise<{ passwordSet: true }> {
  return postAuthed<{ passwordSet: true }>(baseUrl, '/auth/password/set', accessToken, input);
}

export function refreshSession(baseUrl: string, refreshToken: string): Promise<SessionTokens> {
  return post<SessionTokens>(baseUrl, '/auth/refresh', { refreshToken });
}

/** Best effort: a session the server has already forgotten is still signed out. */
export async function endSession(baseUrl: string, refreshToken?: string | null): Promise<void> {
  try {
    await post(baseUrl, '/auth/sign-out', { refreshToken: refreshToken ?? null });
  } catch {
    // Nothing useful to do. The client discards its tokens either way, and a
    // failure here must not leave someone stuck on a screen they asked to leave.
  }
}
