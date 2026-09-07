import { BookOpen, Heart, Home, Mail, PenLine, User, type LucideIcon } from 'lucide-react';

export type NavItem = {
  key: string;
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { key: 'browse', label: 'Home', short: 'Home', href: '/browse', icon: Home },
  { key: 'mailbox', label: 'Mailbox', short: 'Mailbox', href: '/mailbox', icon: Mail },
  { key: 'liked', label: 'Liked', short: 'Liked', href: '/liked', icon: Heart },
  { key: 'circle', label: 'Support Circle', short: 'Circle', href: '/circle', icon: PenLine },
  { key: 'resources', label: 'Resources', short: 'Resources', href: '/resources', icon: BookOpen },
  { key: 'account', label: 'Account', short: 'Account', href: '/account', icon: User },
];

/**
 * The bottom bar keeps five items, as on the phone. Support Circle is reached
 * from Account rather than crowding the bar.
 */
export const TAB_ITEMS = NAV_ITEMS.filter((i) => i.key !== 'circle');

export function isActive(pathname: string, item: NavItem): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
