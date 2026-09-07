import { Suspense } from 'react';

import { Support } from '@/components/support/support';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Support · HeartLink' };

export default function SupportPage() {
  // The open topic is read from the query string, which needs a Suspense
  // boundary for Next to prerender this route.
  return (
    <Suspense fallback={<PageSpinner label="Opening support…" />}>
      <Support />
    </Suspense>
  );
}
