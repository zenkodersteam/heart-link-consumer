/**
 * Form-field rules shared by the website and the phone app.
 *
 * These sit beside `password-policy` for the same reason it exists: the two
 * surfaces ask for the same things and must refuse them for the same reasons,
 * or someone rejected on their phone is accepted on the web and cannot tell
 * why. Each returns the sentence to show under the field, or null when the
 * value is fine.
 *
 * They answer "can this be sent yet", not "is this real". Only the server can
 * say whether an address exists, and its answer belongs in a toast; these
 * catch what can be known before anything is sent.
 */

/**
 * Deliberately permissive: something before an @, something after it, a dot in
 * the domain, no spaces. Tighter patterns reject addresses that genuinely
 * work - plus-tags, new TLDs, apostrophes - and the cost of a false rejection
 * here is someone who cannot sign up at all.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailProblem(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length === 0) return 'Enter your email address.';
  if (!EMAIL_SHAPE.test(trimmed)) return 'Enter a valid email address.';
  return null;
}

/** `null` when a value is present, otherwise a sentence naming the field. */
export function requiredProblem(value: string, label: string): string | null {
  return value.trim().length === 0 ? `${label} is required.` : null;
}
