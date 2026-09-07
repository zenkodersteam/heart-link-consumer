import { Suspense } from 'react';

import { Mailbox } from '@/components/mailbox/mailbox';
import { PageSpinner } from '@/components/ui/spinner';

export const metadata = { title: 'Mailbox · HeartLink' };

export default function MailboxPage() {
  // Which letter is open is read from the query string, so the tree below has
  // to sit behind a Suspense boundary for Next to prerender this route.
  return (
    <Suspense fallback={<PageSpinner label="Opening your mailbox…" />}>
      <Mailbox />
    </Suspense>
  );
}
