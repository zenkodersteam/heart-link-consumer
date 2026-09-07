import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomTabs } from '@/components/shell/bottom-tabs';
import { MobileTopBar } from '@/components/shell/mobile-top-bar';
import { Sidebar } from '@/components/shell/sidebar';

/**
 * Frame for every signed-in screen: rail on desktop, tab bar on a phone.
 *
 * The middleware already turns anonymous visitors away; this second check is
 * defence in depth — if a route ever falls outside the matcher, the page
 * refuses to render rather than showing an empty authenticated shell.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1">{children}</main>
        <BottomTabs />
      </div>
    </div>
  );
}
