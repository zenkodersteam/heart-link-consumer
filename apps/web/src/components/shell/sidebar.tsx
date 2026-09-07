'use client';

import { UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';

import { NAV_ITEMS, isActive } from '@/components/shell/nav-items';
import { UnreadBadge, useUnreadCount } from '@/components/shell/unread-badge';
import { cn } from '@/lib/utils';

/** Midnight rail with a pink pill on the active item, as on the desktop app. */
export function Sidebar() {
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col bg-gradient-to-b from-[#1b0826] via-[#2e1240] to-[#3a1550] px-3.5 py-5 lg:flex">
      <Link href="/browse" className="mb-6 flex items-center gap-2.5 px-3 pt-1.5">
        <Image src="/heartlink-emblem.png" alt="" width={32} height={27} priority />
        <span className="font-[family-name:var(--font-bree)] text-xl">
          <span className="text-sidebar-text">Heart</span>
          <span className="text-primary">Link</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-3 text-[14.5px] font-semibold transition-colors',
                active
                  ? 'bg-gradient-to-r from-primary to-[#c81860] text-white'
                  : 'text-sidebar-text/65 hover:bg-white/[0.06] hover:text-sidebar-text',
              )}
            >
              {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-white/70" /> : null}
              <Icon className="size-[19px] shrink-0" />
              {item.label}
              {item.key === 'mailbox' ? <UnreadBadge count={unread} /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-4 flex flex-col items-center px-2.5 pb-1.5 pt-4">
        <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <p className="text-center font-[family-name:var(--font-bree)] text-[15px] leading-6 text-gold">
          Love Knows
          <br />
          No Bounds
        </p>
        <Heart className="mt-1 size-3 text-gold/80" />
      </div>

      <div className="mt-4 flex justify-center border-t border-white/10 pt-4">
        <UserButton />
      </div>
    </aside>
  );
}
