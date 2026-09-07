import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { OtpForm } from '@/components/auth/otp-form';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Create your account · HeartLink' };

export default function SignUpPage() {
  return (
    <AuthShell>
      <Suspense fallback={<PageSpinner label="Loading…" />}>
        <OtpForm intent="sign_up" />
      </Suspense>
    </AuthShell>
  );
}
