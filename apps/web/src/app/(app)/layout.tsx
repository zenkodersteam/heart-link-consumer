import { hasSessionCookie } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { OnboardingGate } from '@/components/onboarding/onboarding-gate';
import { BottomTabs } from '@/components/shell/bottom-tabs';
import { FeatureStrip } from '@/components/shell/feature-strip';
import { TopNav } from '@/components/shell/top-nav';
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
 *
 * The shell draws around the gate rather than inside it, so someone whose
 * profile is still being checked sees the rail and the tab bar with a spinner
 * in the content area, not a blank page.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!(await hasSessionCookie())) redirect('/sign-in');

  // The top bar spans the full width above both the rail and the content, as
  // the client screens have it — the rail starts below the bar, not beside it.
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <TopNav />
      <div className="flex min-w-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="flex-1">
            <OnboardingGate>{children}</OnboardingGate>
          </main>
          <FeatureStrip />
          <BottomTabs />
        </div>
      </div>
    </div>
  );
}
