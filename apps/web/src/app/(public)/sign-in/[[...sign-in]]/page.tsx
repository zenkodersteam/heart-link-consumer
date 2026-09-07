'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';
import { clerkAppearance } from '@/components/auth/clerk-appearance';
import { AFTER_SIGN_IN } from '@/lib/routes';

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your connections.">
      {/* Clerk's own form rather than a hand-rolled one: it already handles
          two-factor, backup codes and password resets, which the phone app has
          to implement by hand because clerk-expo ships no UI. */}
      <SignIn
        appearance={clerkAppearance}
        signUpUrl="/sign-up"
        fallbackRedirectUrl={AFTER_SIGN_IN}
      />
      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{' '}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
