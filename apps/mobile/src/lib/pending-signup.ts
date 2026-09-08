/**
 * The address someone started signing up with and did not finish.
 *
 * Sign-up asks for a password, then emails a code — the account only exists
 * once that code is entered. Someone who closes the app at that point and comes
 * back to sign in gets "That email or password is not right", which is true and
 * useless: there is no account yet, so there is nothing their password could
 * match.
 *
 * The server cannot say so. It answers identically for a wrong password, an
 * unknown address and an account with no password precisely so that it cannot
 * be asked who has an account here — a disclosure that matters for this
 * product. But *this device* already knows it started a sign-up, so it can say
 * the useful thing without the server disclosing anything.
 *
 * Deliberately in memory only: it is a hint for the next screen, not a record,
 * and an address someone abandoned is not worth persisting to disk.
 */

let pending: string | null = null;

export function rememberPendingSignUp(email: string): void {
  pending = email.trim().toLowerCase();
}

export function clearPendingSignUp(): void {
  pending = null;
}

/** True when this device started signing up with that address and never finished. */
export function isPendingSignUp(email: string): boolean {
  return pending !== null && pending === email.trim().toLowerCase();
}
