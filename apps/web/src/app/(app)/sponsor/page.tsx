import { Suspense } from 'react';

import { Sponsor } from '@/components/sponsor/sponsor';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Sponsor a member · HeartLink' };

export default function SponsorPage() {
  // Arrives with ?profile= (who the gift is for) and sometimes ?checkout=,
  // which Stripe appends on the way back — reading either needs a Suspense
  // boundary for Next to prerender this.
  return (
    <Suspense fallback={<PageSpinner label="Loading…" />}>
      <Sponsor />
    </Suspense>
  );
}
