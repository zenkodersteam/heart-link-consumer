import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { OtpForm } from '@/components/auth/otp-form';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Sign in · HeartLink' };

export default function SignInPage() {
  return (
    <AuthShell>
      <Suspense fallback={<PageSpinner label="Loading…" />}>
        <OtpForm intent="sign_in" />
      </Suspense>
    </AuthShell>
  );
}
