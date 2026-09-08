'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { UserMenu } from '@/components/auth/user-menu';
import { TOP_NAV_ITEMS, isActive } from '@/components/shell/nav-items';
import { UnreadBadge, useUnreadCount } from '@/components/shell/unread-badge';
import { cn } from '@/lib/utils';

/**
 * The white bar across the top of every signed-in screen on a desktop.
 *
 * It repeats what the purple rail already offers, which is unusual — but it is
 * what the client screens show, and the two are not redundant in use: the rail
 * is where someone's eye rests, and the bar is what they reach for after
 * scrolling. Hidden below `lg`, where the phone designs have a compact header
 * and a tab bar instead.
 */
export function TopNav() {
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <header className="hidden shrink-0 items-center gap-8 border-b border-line bg-surface-elevated px-8 py-3.5 lg:flex">
      <Link href="/browse" className="flex shrink-0 items-center gap-2.5">
        <Image src="/heartlink-emblem.png" alt="" width={34} height={29} priority />
        <span className="font-[family-name:var(--font-bree)] text-[22px] leading-none">
          <span className="text-ink">Heart</span>
          <span className="text-primary">Link</span>
        </span>
      </Link>

      <nav className="flex flex-1 items-center justify-center gap-8">
        {TOP_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative py-1.5 text-[15px] transition-colors',
                active ? 'font-semibold text-primary' : 'text-ink hover:text-primary',
              )}
            >
              {item.short}
              {item.key === 'mailbox' ? (
                <UnreadBadge
                  count={unread}
                  className="absolute -right-4 -top-0.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-white"
                />
              ) : null}
              {/* The underline is drawn rather than a border so it sits under
                  the word only, as the screens have it. */}
              {active ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0">
        <UserMenu tone="light" />
      </div>
    </header>
  );
}
