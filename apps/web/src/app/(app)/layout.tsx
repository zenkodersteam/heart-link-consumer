import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Shell for signed-in screens.
 *
 * The middleware already turns anonymous visitors away; this second check is
 * for defence in depth — if a route ever slips out of the matcher, the page
 * still refuses to render rather than exposing an empty authenticated shell.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <div className="min-h-dvh bg-surface">{children}</div>;
}
