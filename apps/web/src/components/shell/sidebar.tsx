'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';

import { NAV_ITEMS, isActive } from '@/components/shell/nav-items';
import { UnreadBadge, useUnreadCount } from '@/components/shell/unread-badge';
import { cn } from '@/lib/utils';

/**
 * The deep purple rail down the left of every signed-in screen.
 *
 * Flat purple rather than the gradient it had, and the active item is a lighter
 * purple block rather than a pink pill — the pink in these screens is spent on
 * the top bar's underline and the Like button, and a pink block here competed
 * with both. The gold-bordered motto sits at the foot, as drawn.
 */
export function Sidebar() {
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <aside className="hidden w-[214px] shrink-0 flex-col bg-sidebar px-3.5 py-6 lg:flex">
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-3 text-[14.5px] transition-colors',
                active
                  ? 'bg-white/[0.09] font-semibold text-sidebar-text'
                  : 'text-sidebar-text/80 hover:bg-white/[0.05] hover:text-sidebar-text',
              )}
            >
              <Icon className="size-[19px] shrink-0" />
              {item.label}
              {item.key === 'mailbox' ? <UnreadBadge count={unread} /> : null}
            </Link>
          );
        })}
      </nav>

      {/* Gold-bordered motto at the foot, as the screens draw it. */}
      <div className="mt-4 rounded-xl border border-gold/70 px-4 py-5 text-center">
        <p className="font-[family-name:var(--font-bree)] text-[15px] leading-6 text-sidebar-text">
          Love Knows
          <br />
          No Bounds
        </p>
        <Heart className="mx-auto mt-2 size-3.5 fill-gold text-gold" />
      </div>
    </aside>
  );
}
