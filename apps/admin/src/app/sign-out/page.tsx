import { Suspense } from 'react';
import { SignOutFlow } from './SignOutFlow';

/**
 * Server half of the sign-out screen.
 *
 * `SignOutFlow` reads the query string to say why someone was signed out, and
 * `useSearchParams` suspends while Next prerenders — without a boundary here
 * the production build fails on this page, even though it works in dev.
 */
export default function SignOutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
          <p className="text-sm text-text-muted">Signing you out…</p>
        </main>
      }
    >
      <SignOutFlow />
    </Suspense>
  );
}
