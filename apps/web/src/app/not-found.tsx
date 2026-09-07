import Link from 'next/link';

import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-10">
        <Wordmark />
      </Link>

      <p className="font-[family-name:var(--font-bree)] text-6xl text-primary">404</p>
      <h1 className="mt-4 font-[family-name:var(--font-bree)] text-3xl text-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The link may be out of date, or the page may have moved. Nothing has happened to your
        letters.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/mailbox">Open mailbox</Link>
        </Button>
      </div>
    </main>
  );
}
