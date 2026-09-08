import { Suspense } from 'react';

import { AdminSignInForm } from '@/components/auth/AdminSignInForm';
import { AuthShell } from '@/components/shell/AuthShell';

export default function AdminSignInPage() {
  return (
    <AuthShell eyebrow="HeartLink Admin" title="Sign in" lede="Access your workspace.">
      <Suspense fallback={null}>
        <AdminSignInForm />
      </Suspense>
    </AuthShell>
  );
}
