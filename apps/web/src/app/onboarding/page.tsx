import { redirect } from 'next/navigation';

import { Onboarding } from '@/components/onboarding/onboarding';
import { hasSessionCookie } from '@/lib/session';

/**
 * Where a new account lands straight after sign-up.
 *
 * Deliberately outside the `(app)` group: the rail and tab bar lead to screens
 * that expect a finished profile, so the flow renders on its own until it is
 * submitted.
 */
export const metadata = { title: 'Set up your profile · HeartLink' };

export default async function OnboardingPage() {
  if (!(await hasSessionCookie())) redirect('/sign-in');
  return <Onboarding />;
}
