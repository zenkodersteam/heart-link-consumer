import { CreditCard, Heart, Mail, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminUserDetail } from '@heartlink/api-contract';

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The four numbers worth a heading.
 *
 * Chosen because each answers a question staff actually arrive with: are they
 * writing to anyone, how much, are they liking profiles, and have they paid.
 * Anything else belongs further down the page where it can be read slowly.
 */
export function UserStats({ user }: { user: AdminUserDetail }) {
  const tiles: { label: string; value: string; hint?: string; icon: LucideIcon }[] = [
    {
      label: 'Conversations',
      value: String(user.activity.threadCount),
      icon: Mail,
    },
    {
      label: 'Letters sent',
      value: String(user.letters.sentTotal),
      hint: `${user.letters.sentThisMonth} this month`,
      icon: Send,
    },
    {
      label: 'Liked profiles',
      value: String(user.activity.savedProfileCount),
      icon: Heart,
    },
    {
      label: 'Paid to date',
      value: money(user.activity.paymentTotalCents),
      hint:
        user.letters.creditBalance > 0
          ? `${user.letters.creditBalance} letter credits left`
          : undefined,
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-border bg-background p-4 shadow-soft"
        >
          <div className="flex items-center gap-2 text-text-muted">
            <tile.icon aria-hidden className="size-4" />
            <span className="text-[12px] font-medium uppercase tracking-wide">{tile.label}</span>
          </div>
          <p className="mt-2 font-serif text-2xl leading-8 text-text">{tile.value}</p>
          {/* Reserved whether or not it is used, so the four tiles keep one
              baseline instead of stepping up and down across the row. */}
          <p className="mt-0.5 min-h-[18px] text-[12px] text-text-muted">{tile.hint ?? ''}</p>
        </div>
      ))}
    </div>
  );
}
