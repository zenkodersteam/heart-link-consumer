'use client';

import { BookOpen, Headphones, Heart, Mail, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

/**
 * The four promises along the bottom of every signed-in screen, as the client
 * screens have them.
 *
 * Hidden below `lg`: on the phone designs this band is not there — the tab bar
 * occupies that space — and stacking four blocks above it would push the deck
 * off the screen.
 */
const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Heart,
    title: 'Meaningful Connections',
    body: 'Find and connect with incredible people.',
  },
  {
    icon: Mail,
    title: 'Secure Communication',
    body: 'Our secure inbox keeps your letters private and protected.',
  },
  {
    icon: BookOpen,
    title: 'Support & Resources',
    body: 'Access tools and support for every step of the journey.',
  },
  {
    icon: Headphones,
    title: 'Hope for the Future',
    body: 'Building stronger connections for a better tomorrow.',
  },
];

export function FeatureStrip() {
  // Not on the mailbox. That screen is a two-pane app view that runs to the
  // bottom of the window — a band of promises under it pushed the composer up
  // and made a letter someone is writing share the page with an advert.
  const pathname = usePathname();
  if (pathname?.startsWith('/mailbox')) return null;

  return (
    <div className="hidden border-t border-line bg-surface-elevated px-6 py-5 lg:block">
      <ul className="mx-auto grid max-w-6xl grid-cols-4 gap-6">
        {FEATURES.map((feature, index) => (
          <li
            key={feature.title}
            className={index > 0 ? 'flex items-start gap-3 border-l border-line pl-6' : 'flex items-start gap-3'}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-faint">
              <feature.icon className="size-[18px] text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block font-[family-name:var(--font-bree)] text-[13.5px] text-ink">
                {feature.title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-[1.45] text-ink-soft">
                {feature.body}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
