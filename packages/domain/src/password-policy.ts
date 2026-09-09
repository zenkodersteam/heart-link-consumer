/**
 * What counts as an acceptable password, shared by the website, the phone app
 * and the admin console.
 *
 * This is a *copy* of the rule the API enforces (`packages/auth/src/password.ts`
 * in the heart-link repo), because the two live in different repositories. The
 * server is the authority: it re-checks on every request and its answer wins.
 * What this buys is telling someone their password is too short while they are
 * still typing it, rather than after a round trip.
 *
 * If the server's rule changes, change it here too — the numbers are stated in
 * both places on purpose, and a mismatch shows up as a password the form
 * accepts and the API refuses.
 */

export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt ignores everything past 72 bytes, so a longer password is not the
 * password someone thinks they set. Refusing is honest; truncating quietly is
 * not.
 */
export const PASSWORD_MAX_BYTES = 72;

/**
 * At least one character that is not a letter or a digit.
 *
 * Asked for by the client, and matched by the API's own copy of this rule.
 * Worth recording that composition rules are not what the research supports —
 * they push people towards `Password1!` rather than the long passphrases that
 * actually resist guessing — but a rule the server enforces has to be stated
 * here too, or the form accepts what the API refuses.
 */
const SPECIAL_CHARACTER = /[^A-Za-z0-9]/;

/** The problem with a password, or null when there is none. */
export function passwordProblem(password: string): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Enter a password.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  // Bytes rather than characters: the 72 is bcrypt's limit, and an emoji or an
  // accented letter spends more than one byte.
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(password.normalize('NFKC')).length
      : password.normalize('NFKC').length;
  if (bytes > PASSWORD_MAX_BYTES) {
    return `Use ${PASSWORD_MAX_BYTES} characters or fewer.`;
  }
  if (!SPECIAL_CHARACTER.test(password)) {
    return 'Add at least one special character, such as ! ? # or $.';
  }
  return null;
}

/**
 * Whether a password is long enough to submit.
 *
 * Deliberately the same function the message comes from, so a form cannot
 * enable its button on one rule and explain itself with another.
 */
export function isPasswordAcceptable(password: string): boolean {
  return passwordProblem(password) === null;
}
