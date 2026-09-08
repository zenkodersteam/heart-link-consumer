'use client';

import type { MailboxMessage } from '@heartlink/consumer-api';
import { stateName } from '@heartlink/consumer-api';
import { ChevronRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useRef } from 'react';

import { Avatar } from '@/components/profiles/avatar';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { useLetterLimit, useMailboxThread, usePublicProfile } from '@/lib/queries';
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
  // Age and state for the header. The facility name is deliberately not shown
  // on any member-facing screen, so it is not part of this line.
  const { data: peer } = usePublicProfile(data?.profileId);
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

  const peerMeta = [
    peer?.age != null ? String(peer.age) : null,
    peer?.facility?.state ? stateName(peer.facility.state) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      {/* Who this is, then the way through to them: portrait, name over a line
          of detail, and a link out to the full profile — which is where liking,
          reporting and blocking already live. */}
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Link
          href={`/profiles/${data.profileId}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition-opacity hover:opacity-80"
        >
          <Avatar
            name={data.profileDisplayName}
            src={peer?.primaryPhotoUrl ?? data.profilePhotoUrl}
            className="size-11"
          />
          <span className="min-w-0">
            <span className="block truncate font-[family-name:var(--font-bree)] text-lg text-ink">
              {data.profileDisplayName}
            </span>
            {peerMeta ? (
              <span className="block truncate text-[13px] text-ink-soft">{peerMeta}</span>
            ) : null}
          </span>
        </Link>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/profiles/${data.profileId}`}>View profile</Link>
        </Button>
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
        {/* Said where it matters: this is not a message that arrives in a
            second, and knowing that before writing changes what people write. */}
        <p className="mt-2 px-1 text-[11.5px] text-ink-faint">
          Checked by our team, then printed and posted. Replies are scanned back here.
        </p>
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
          'max-w-[85%] rounded-card px-4 py-3 sm:max-w-[75%]',
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

/**
 * Shown above a first letter, where the process is not yet familiar.
 *
 * Three words rather than a paragraph: it is the thing people most need to
 * know before writing, and the thing they skip if it is a block of prose. The
 * word limit lives in the composer's own counter, so it is not repeated here.
 */
export function ComposeNote({ name, wordLimit }: { name: string; wordLimit: number | null }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
        {['Reviewed', 'Printed', 'Posted'].map((step, i) => (
          <Fragment key={step}>
            {i > 0 ? <ChevronRight className="size-3.5 text-ink-faint" /> : null}
            {step}
          </Fragment>
        ))}
      </p>
      <p className="mt-0.5 text-[12px] text-ink-faint">
        Replies are scanned back into this thread.
        {wordLimit !== null ? ` Letters to ${name} can be up to ${wordLimit} words.` : ''}
      </p>
    </div>
  );
}
