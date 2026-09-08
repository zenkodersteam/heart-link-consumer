'use client';

import { Inbox, PenLine, Send } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { LettersCard } from './letters-card';

export type MailFolder = 'inbox' | 'sent';

/**
 * The narrow column on the left of the mailbox: compose, folders, allowance.
 *
 * Two folders rather than the four the design draws. Inbox and Sent are real —
 * a thread's last direction says which it belongs in — but Archive and Trash
 * have nothing behind them in the API, and a folder that is always empty
 * because it cannot ever fill is worse than one that is not there.
 *
 * The design puts a storage meter here ("2.1 GB of 10 GB used"). Letters are
 * not files and there is no quota, so the slot carries what a member actually
 * needs to know before writing: how many letters they have left.
 */
export function FolderRail({
  folder,
  onSelect,
  counts,
}: {
  folder: MailFolder;
  onSelect: (folder: MailFolder) => void;
  counts: { inbox: number; sent: number; unread: number };
}) {
  const folders: { key: MailFolder; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: 'inbox', label: 'Inbox', icon: Inbox, badge: counts.unread },
    { key: 'sent', label: 'Sent', icon: Send },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Button asChild className="w-full">
        <Link href="/browse">
          <PenLine className="size-4" />
          Compose New Message
        </Link>
      </Button>

      <nav className="flex flex-col gap-1">
        {folders.map((item) => {
          const active = folder === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-colors',
                active
                  ? 'bg-primary-faint font-semibold text-primary'
                  : 'text-ink hover:bg-surface-muted',
              )}
            >
              <item.icon className="size-[18px] shrink-0" />
              {item.label}
              {item.badge ? (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <LettersCard />
    </div>
  );
}
