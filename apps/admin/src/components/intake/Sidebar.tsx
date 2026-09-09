'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Ref } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Users,
  UserRound,
  CreditCard,
  Mail,
  History,
  MailCheck,
  MailOpen,
  Building2,
  BookOpen,
  Heart,
  ShieldCheck,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { NavCounts } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';
import { useNavCounts } from './NavCountsProvider';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: keyof NavCounts;
  children?: Array<{ label: string; href: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Intake',
    href: '/intake',
    icon: Inbox,
    badgeKey: 'intake',
    children: [
      { label: 'Queue', href: '/intake' },
      { label: 'Review', href: '/intake/review' },
    ],
  },
  { label: 'Profiles', href: '/profiles', icon: Users, badgeKey: 'profiles' },
  // Listings and the people who write to them are different populations, so
  // they get separate entries rather than tabs inside one.
  { label: 'Members', href: '/users', icon: UserRound },
  { label: 'Payments', href: '/payments', icon: CreditCard, badgeKey: 'payments' },
  // Letters sit above the post queue because they come first: a letter is
  // approved here, then appears there to be sent.
  { label: 'Letters', href: '/letters', icon: MailCheck, badgeKey: 'letters' },
  { label: 'Outbound Mail', href: '/outbound-mail', icon: Mail },
  { label: 'Inbound Mail', href: '/inbound-mail', icon: MailOpen },
  { label: 'Moderation', href: '/moderation', icon: ShieldCheck, badgeKey: 'moderation' },
  { label: 'Facilities', href: '/facilities', icon: Building2 },
  { label: 'Resources', href: '/resources', icon: BookOpen },
  { label: 'Activity', href: '/activity', icon: History },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

interface SidebarProps {
  className?: string;
  /** Fires after any nav link is followed. Used to dismiss the mobile drawer. */
  onNavigate?: () => void;
  /** When provided, a dismiss control renders in the brand row (drawer mode). */
  onClose?: () => void;
  closeRef?: Ref<HTMLButtonElement>;
}

export function Sidebar({ className, onNavigate, onClose, closeRef }: SidebarProps) {
  const pathname = usePathname();
  const { counts } = useNavCounts();
  return (
    <aside
      className={cn(
        'flex h-full w-[240px] shrink-0 flex-col overflow-y-auto bg-sidebar py-6',
        className,
      )}
    >
      {/* Brand lockup - heart-keyhole emblem + wordmark, matches the consumer rail */}
      <div className="flex items-center justify-between gap-2 px-5 pb-6">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/heartlink-emblem.png" alt="HeartLink" className="h-6 w-auto" />
          <span className="flex items-baseline">
            <span className="font-serif text-[22px] leading-none text-sidebar-text">Heart</span>
            <span className="font-serif text-[22px] leading-none text-primary">Link</span>
          </span>
        </Link>
        {onClose ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="-mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-sidebar-muted transition-colors hover:bg-sidebar-elevated hover:text-sidebar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const exact = pathname === item.href;
          return (
            <div key={item.href} className="flex flex-col">
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={exact ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 pl-5 pr-4 py-2.5 transition-all active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                  active ? 'bg-sidebar-elevated' : 'hover:bg-sidebar-elevated/50',
                )}
              >
                {/* Active indicator bar - 3x20px, left edge */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-sm bg-primary"
                  />
                )}
                <Icon
                  className={cn(
                    'size-[18px] shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-sidebar-muted group-hover:text-sidebar-text',
                  )}
                />
                <span
                  className={cn(
                    'flex-1 text-sm leading-5',
                    active
                      ? 'font-semibold text-sidebar-text'
                      : 'font-medium text-sidebar-muted transition-colors group-hover:text-sidebar-text',
                  )}
                >
                  {item.label}
                </span>
                {item.badgeKey && counts && counts[item.badgeKey] > 0 ? (
                  <span className="animate-badge-pop inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-medium leading-[15px] text-white">
                    {counts[item.badgeKey]}
                  </span>
                ) : null}
              </Link>
              {item.children && active && (
                <div className="flex flex-col">
                  {item.children.map((sub) => {
                    const subActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onNavigate}
                        aria-current={subActive ? 'page' : undefined}
                        className={cn(
                          'py-2 pl-[52px] pr-4 text-[13px] leading-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                          subActive
                            ? 'font-medium text-primary'
                            : 'font-normal text-sidebar-muted hover:text-sidebar-text',
                        )}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Brand sign-off - premium gold-on-purple lockup */}
      <div className="mt-auto px-3 pt-6">
        <div className="relative overflow-hidden rounded-lg border border-accent-gold/30 bg-gradient-to-b from-accent-gold/[0.14] to-accent-gold/0 px-4 py-5 text-center">
          {/* Soft gold glow behind the mark */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-accent-gold/25 blur-2xl"
          />
          <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-accent-gold/15 ring-1 ring-accent-gold/30">
            <Heart
              aria-hidden
              strokeWidth={1.75}
              fill="currentColor"
              className="size-4 text-accent-gold"
            />
          </span>
          <p className="relative mt-2.5 font-serif text-[15px] leading-[20px] tracking-[0.01em] text-accent-gold">
            Love Knows
            <br />
            No Bounds
          </p>
          <span
            aria-hidden
            className="relative mx-auto mt-3 block h-px w-12 bg-gradient-to-r from-transparent via-accent-gold/55 to-transparent"
          />
        </div>
      </div>
    </aside>
  );
}
