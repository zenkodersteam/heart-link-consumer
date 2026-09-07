'use client';

import { useMailboxThreads } from '@/lib/queries';

/** Total unread letters. Hidden entirely when the mailbox cannot be reached. */
export function useUnreadCount(): number {
  const { data } = useMailboxThreads();
  return data?.items.reduce((n, t) => n + t.unreadCount, 0) ?? 0;
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={
        className ??
        'ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white'
      }
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
