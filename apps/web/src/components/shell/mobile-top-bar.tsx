'use client';

import Image from 'next/image';

import { UserMenu } from '@/components/auth/user-menu';
import Link from 'next/link';

export function MobileTopBar() {
  return (
    <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-3 lg:hidden">
      <Link href="/browse" className="flex items-center gap-2">
        <Image src="/heartlink-emblem.png" alt="" width={24} height={20} priority />
        <span className="font-[family-name:var(--font-bree)] text-lg">
          <span className="text-ink">Heart</span>
          <span className="text-primary">Link</span>
        </span>
      </Link>
      <UserMenu tone="light" />
    </header>
  );
}
