import { hasSessionCookie } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { BottomTabs } from '@/components/shell/bottom-tabs';
import { MobileTopBar } from '@/components/shell/mobile-top-bar';
import { Sidebar } from '@/components/shell/sidebar';

/**
 * Frame for every signed-in screen: rail on desktop, tab bar on a phone.
 *
 * The proxy already turns anonymous visitors away; this second check is there
 * for a route that ever falls outside its matcher, so the page refuses to
 * render rather than showing an empty authenticated shell.
 *
 * Like the proxy, it reads the cookie's presence rather than proving the
 * session is live — that is the API's job, and it does it on every request.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSessionCookie())) redirect('/sign-in');

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
