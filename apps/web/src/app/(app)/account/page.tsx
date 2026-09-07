import { Suspense } from 'react';

import { Account } from '@/components/account/account';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Account · HeartLink' };

export default function AccountPage() {
  // The return from checkout is signalled in the query string, which has to sit
  // behind a Suspense boundary for Next to prerender this route.
  return (
    <Suspense fallback={<PageSpinner label="Opening your account…" />}>
      <Account />
    </Suspense>
  );
}
