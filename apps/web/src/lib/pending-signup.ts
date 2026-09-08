/**
 * The address someone started signing up with and did not finish.
 *
 * Sign-up asks for a password, then emails a code — the account only exists
 * once that code is entered. Someone who closes the tab at that point and comes
 * back to sign in gets "That email or password is not right", which is true and
 * useless: there is no account yet, so there is nothing their password could
 * match.
 *
 * The server cannot say so. It answers identically for a wrong password, an
 * unknown address and an account with no password precisely so that it cannot
 * be asked who has an account here — a disclosure that matters for this
 * product. But this browser already knows it started a sign-up, so it can say
 * the useful thing without the server disclosing anything.
 *
 * sessionStorage rather than localStorage: it is a hint for the next few
 * minutes, not a record, and it should not outlive the tab. Every access is
 * guarded — Safari in private mode throws on the very first read.
 */

const KEY = 'hl_pending_signup';

export function rememberPendingSignUp(email: string): void {
  try {
    sessionStorage.setItem(KEY, email.trim().toLowerCase());
  } catch {
    // Storage unavailable. The message stays generic, which is only a worse
    // message, never a broken screen.
  }
}

export function clearPendingSignUp(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // See above.
  }
}

/** True when this browser started signing up with that address and never finished. */
export function isPendingSignUp(email: string): boolean {
  try {
    return sessionStorage.getItem(KEY) === email.trim().toLowerCase();
  } catch {
    return false;
  }
}
