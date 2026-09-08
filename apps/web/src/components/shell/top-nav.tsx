'use client';

import Image from 'next/image';
import Link from 'next/link';

import { UserMenu } from '@/components/auth/user-menu';

/**
 * The white bar across the top of every signed-in screen on a desktop.
 *
 * Brand and account only. It used to repeat the purple rail's links in the
 * centre, which meant two sets of navigation on one screen, disagreeing about
 * where you were: the rail marked the section with a filled pill, the bar with
 * an underline, and Account existed in one but not the other. The rail is the
 * navigation; this bar is the frame around it.
 *
 * Hidden below `lg`, where the phone designs have a compact header and a tab
 * bar instead.
 */
export function TopNav() {
  return (
    <header className="hidden shrink-0 items-center justify-between border-b border-line bg-surface-elevated px-8 py-3.5 lg:flex">
      <Link href="/browse" className="flex shrink-0 items-center gap-2.5">
        <Image src="/heartlink-emblem.png" alt="" width={34} height={29} priority />
        <span className="font-[family-name:var(--font-bree)] text-[22px] leading-none">
          <span className="text-ink">Heart</span>
          <span className="text-primary">Link</span>
        </span>
      </Link>

      <div className="shrink-0">
        <UserMenu tone="light" />
      </div>
    </header>
  );
}
