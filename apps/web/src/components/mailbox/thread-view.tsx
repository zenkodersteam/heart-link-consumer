'use client';

import type { MailboxMessage } from '@heartlink/consumer-api';
import { FileText, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Avatar } from '@/components/profiles/avatar';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { useLetterLimit, useMailboxThread } from '@/lib/queries';
import { cn } from '@/lib/utils';

import { deliveryLabel, formatTime } from './lib';
import { LetterComposer } from './letter-composer';

/** One correspondence: every letter both ways, and the box to write the next. */
export function ThreadView({
  threadId,
  onSend,
  canSend,
  cannotSendReason,
}: {
  threadId: string;
  onSend: (profileId: string, body: string) => Promise<boolean>;
  canSend: boolean;
  cannotSendReason?: string;
}) {
  const { data, isPending, isError, refetch } = useMailboxThread(threadId);
  const { data: limit } = useLetterLimit(data?.profileId);
  const scroller = useRef<HTMLDivElement>(null);

  // Open on the newest letter, the way you would pick up a pile of post.
  // Only when this pane is the thing that scrolls — on a phone the messages
  // sit in the page, and yanking the window down would skip the header.
  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
  }, [data?.messages.length]);

  if (isPending) return <PageSpinner label="Opening this letter…" />;

  if (isError || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-ink-soft">We couldn&apos;t open this letter.</p>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Avatar name={data.profileDisplayName} src={data.profilePhotoUrl} className="size-10" />
        <p className="font-[family-name:var(--font-bree)] text-lg text-ink">
          {data.profileDisplayName}
        </p>
      </header>

      <div ref={scroller} className="space-y-4 px-5 py-5 lg:flex-1 lg:overflow-y-auto">
        {data.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-line bg-surface px-5 py-4">
        <LetterComposer
          placeholder={`Write to ${data.profileDisplayName}…`}
          limit={limit}
          disabled={!canSend}
          disabledReason={cannotSendReason}
          onSend={(body) => onSend(data.profileId, body)}
        />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MailboxMessage }) {
  const outbound = message.direction === 'outbound';
  return (
    <div className={cn('flex flex-col', outbound ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[--radius-card] px-4 py-3 sm:max-w-[75%]',
          outbound
            ? 'bg-primary text-on-primary'
            : 'border border-line bg-surface-elevated text-ink',
        )}
      >
        {message.subject ? (
          <p className="mb-1.5 text-sm font-bold">{message.subject}</p>
        ) : null}
        {message.body ? (
          <p className="whitespace-pre-line text-[15px] leading-7">{message.body}</p>
        ) : message.scanUrl ? (
          // A scanned letter often carries no typed text at all. Without this
          // line the bubble renders empty, which reads as a letter that failed
          // to arrive rather than one that came in on paper.
          <p className="text-[15px] italic leading-7 opacity-80">
            This letter arrived as a scan.
          </p>
        ) : null}
        {message.scanUrl ? <OriginalScanLink url={message.scanUrl} outbound={outbound} /> : null}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-ink-faint">
        {formatTime(message.createdAt)}
        {outbound && message.deliveryStatus ? ` · ${deliveryLabel(message.deliveryStatus)}` : ''}
      </p>
    </div>
  );
}

/**
 * Inbound letters are scanned paper. The link is signed and short-lived, so it
 * is opened on demand rather than embedded and left to expire on the page.
 */
function OriginalScanLink({ url, outbound }: { url: string; outbound: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold underline-offset-2 hover:underline',
        outbound ? 'text-on-primary/90' : 'text-primary',
      )}
    >
      <FileText className="size-3.5" />
      View the original letter
    </a>
  );
}

/** Shown above a first letter, where the process is not yet familiar. */
export function ComposeNote({ name, wordLimit }: { name: string; wordLimit: number | null }) {
  return (
    <p className="flex gap-2 rounded-xl bg-surface-muted px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>
        Our team reviews every letter, then it is printed and mailed to the facility. Replies are
        scanned back into this thread.
        {wordLimit !== null ? ` Letters to ${name} can be up to ${wordLimit} words.` : ''}
      </span>
    </p>
  );
}
