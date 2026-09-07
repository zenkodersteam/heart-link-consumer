import { Suspense } from 'react';

import { AdminOtpForm } from '@/components/auth/AdminOtpForm';
import { AuthShell } from '@/components/shell/AuthShell';

export default function AdminSignInPage() {
  return (
    <AuthShell eyebrow="HeartLink Admin" title="Sign in" lede="Access your workspace.">
      <Suspense fallback={null}>
        <AdminOtpForm />
      </Suspense>
    </AuthShell>
  );
}
