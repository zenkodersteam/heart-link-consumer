import Image from 'next/image';

import { cn } from '@/lib/utils';

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/heartlink-emblem.png" alt="" width={26} height={22} priority />
      <span className="font-[family-name:var(--font-bree)] text-xl">
        <span className={cn(onDark ? 'text-sidebar-text' : 'text-ink')}>Heart</span>
        <span className="text-primary">Link</span>
      </span>
    </span>
  );
}
