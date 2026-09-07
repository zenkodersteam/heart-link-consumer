'use client';

import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';
import { clerkAppearance } from '@/components/auth/clerk-appearance';
import { AFTER_SIGN_UP } from '@/lib/routes';

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes about a minute, and browsing is free."
    >
      <SignUp
        appearance={clerkAppearance}
        signInUrl="/sign-in"
        // New members finish their profile before anything else; sending them
        // to browse first means writing a letter is blocked a few taps later
        // with no explanation.
        fallbackRedirectUrl={AFTER_SIGN_UP}
      />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
