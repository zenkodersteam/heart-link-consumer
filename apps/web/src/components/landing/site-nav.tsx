import Link from 'next/link';

import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="HeartLink home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
