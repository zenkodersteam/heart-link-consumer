import { BookOpen, Heart, Home, LifeBuoy, Mail, User, type LucideIcon } from 'lucide-react';

import { isBuilt } from '@/lib/routes';

export type NavItem = {
  key: string;
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Order, labels and icons follow the client screens. The rail says "Liked
 * Profiles" where the top bar and the tab bar say "Liked" — that is how the
 * designs have it, and `short` is what carries the difference.
 */
const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'browse', label: 'Home', short: 'Home', href: '/browse', icon: Home },
  { key: 'mailbox', label: 'Mailbox', short: 'Mailbox', href: '/mailbox', icon: Mail },
  { key: 'liked', label: 'Liked Profiles', short: 'Liked', href: '/liked', icon: Heart },
  { key: 'resources', label: 'Resources', short: 'Resources', href: '/resources', icon: BookOpen },
  { key: 'support', label: 'Support', short: 'Support', href: '/support', icon: LifeBuoy },
  { key: 'account', label: 'Account', short: 'Account', href: '/account', icon: User },
];

/**
 * An item appears once its screen exists.
 *
 * The port is landing these a few at a time, and a rail item that goes nowhere
 * is worse than one that has not arrived yet — see BUILT_ROUTES in lib/routes.
 */
export const NAV_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter((item) => isBuilt(item.href));

/**
 * The phone's tab bar carries five: Home, Mailbox, Liked, Resources, Support.
 * Account is reached from the avatar rather than crowding the bar.
 */
export const TAB_ITEMS = NAV_ITEMS.filter((item) => item.key !== 'account');

/** The top bar drops Account too — the avatar on its right is that door. */
export const TOP_NAV_ITEMS = NAV_ITEMS.filter((item) => item.key !== 'account');

export function isActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
