import { Suspense } from 'react';

import { Plans } from '@/components/plans/plans';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Plans · HeartLink' };

export default function PlansPage() {
  // The sponsor flow arrives with ?profile=, which decides which plan set is
  // shown — reading it needs a Suspense boundary for Next to prerender this.
  return (
    <Suspense fallback={<PageSpinner label="Loading plans…" />}>
      <Plans />
    </Suspense>
  );
}
