'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TAB_ITEMS, isActive } from '@/components/shell/nav-items';
import { UnreadBadge, useUnreadCount } from '@/components/shell/unread-badge';
import { cn } from '@/lib/utils';

/**
 * Bottom bar for narrow screens. Marked with tint alone, the way iOS does —
 * a filled pill is Material's pattern and reads as a web nav on a phone.
 */
export function BottomTabs() {
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <nav
      className="sticky bottom-0 z-30 flex border-t border-line bg-surface-elevated lg:hidden"
      // Keeps the bar clear of the home indicator on iOS Safari.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TAB_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5',
              active ? 'text-primary' : 'text-ink-faint',
            )}
          >
            <span className="relative">
              <Icon className="size-6" />
              {item.key === 'mailbox' ? (
                <UnreadBadge
                  count={unread}
                  className="absolute -top-1 left-3.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white"
                />
              ) : null}
            </span>
            <span className={cn('text-[10px]', active && 'font-semibold')}>{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
