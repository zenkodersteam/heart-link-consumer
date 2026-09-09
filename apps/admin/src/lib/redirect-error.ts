/**
 * Next's `redirect()` reports itself by throwing.
 *
 * A server action that redirects on success therefore lands in the caller's
 * `catch`, and a component that treats everything there as a failure tells the
 * reviewer the thing failed while it is busy succeeding — which is exactly what
 * "Failed to approved: NEXT_REDIRECT" was.
 *
 * The exception has to be rethrown once recognised: it is how the navigation
 * actually happens, and swallowing it leaves the reviewer on a page that has
 * already moved on.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}
