'use client';

import { ChevronLeft, Lock, Mail, PenLine, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Avatar } from '@/components/profiles/avatar';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import {
  useComposeLetter,
  useLetterLimit,
  useMailboxThreads,
  useMarkThreadRead,
  useMyProfile,
  useSavedProfiles,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

import { formatTime } from './lib';
import { LetterComposer } from './letter-composer';
import { LettersCard } from './letters-card';
import { ComposeNote, ThreadView } from './thread-view';

/**
 * The secure mailbox.
 *
 * Outbound letters are printed and posted for the member; inbound ones are
 * their correspondent's reply, scanned in by our team. This is not chat, and
 * the wording throughout is careful not to imply that it is.
 *
 * Which letter is open lives in the URL rather than in state, so the browser's
 * back button steps out of a thread the way people expect it to, and a link to
 * one can be shared or reloaded.
 */
export function Mailbox() {
  const router = useRouter();
  const params = useSearchParams();

  const threadId = params.get('thread');
  const composeId = params.get('compose');
  const composeName = params.get('name') ?? 'this person';
  const purchase = params.get('purchase');

  const { data, isPending, isError, error, refetch } = useMailboxThreads();
  const { data: myProfile } = useMyProfile();
  const { data: saved } = useSavedProfiles();
  const { data: composeLimit } = useLetterLimit(composeId ?? undefined);
  const composeLetter = useComposeLetter();
  const { mutate: markThreadRead } = useMarkThreadRead();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Letters unlock once the member's own profile clears moderation.
  const profileApproved = myProfile?.status === 'approved';

  const threads = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(() => {
    const query = debounced.trim().toLowerCase();
    return query
      ? threads.filter((t) => t.profileDisplayName.toLowerCase().includes(query))
      : threads;
  }, [threads, debounced]);

  // Opening a letter clears its unread badge. Guarded by a ref so a re-render
  // while the thread is open does not fire the mutation again.
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!threadId || markedRef.current === threadId) return;
    markedRef.current = threadId;
    markThreadRead(threadId);
  }, [threadId, markThreadRead]);

  // Credits are granted by the payment webhook, so the balance is refetched
  // rather than assumed to have changed.
  useEffect(() => {
    if (purchase !== 'success') return;
    toast.success('Letters added', { description: 'Your new letters are ready to use.' });
    router.replace('/mailbox');
  }, [purchase, router]);

  // A direct compose link is not a way around liking someone first, so it is
  // honoured only for a profile that is currently in Liked.
  const composeAllowed =
    composeId !== null && (saved?.items ?? []).some((p) => p.id === composeId);
  useEffect(() => {
    if (!composeId || !saved || composeAllowed) return;
    toast.info('Like first', { description: 'Like a profile before writing a letter.' });
    router.replace('/mailbox');
  }, [composeId, saved, composeAllowed, router]);

  const sendLetter = async (profileId: string, body: string): Promise<boolean> => {
    if (!profileApproved) {
      toast.info('Profile in review', {
        description: 'Letters unlock once our team approves your profile, usually within a day.',
      });
      return false;
    }
    try {
      const result = await composeLetter.mutateAsync({ profileId, input: { body } });
      if (!result.sent) {
        toast.error('Out of letters', {
          description: 'You have used your letters for this period. Buy more from your mailbox.',
        });
        return false;
      }
      toast.success('Letter sent for review', {
        description: 'Our team checks every letter before it is printed and posted.',
      });
      if (composeId) router.replace('/mailbox');
      return true;
    } catch (err) {
      toast.error('We could not send that letter', {
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
      });
      return false;
    }
  };

  const unread = threads.reduce((total, thread) => total + thread.unreadCount, 0);
  const sendBlockedReason = profileApproved
    ? undefined
    : 'Letters unlock once your profile is approved';

  const listColumn = (
    <div className="flex min-h-0 flex-col gap-4">
      <Button asChild className="w-full">
        <Link href="/browse">
          <PenLine className="size-4" />
          Write a new letter
        </Link>
      </Button>

      <LettersCard profileApproved={Boolean(profileApproved)} />

      <label className="flex items-center gap-2 rounded-[--radius-pill] border border-line bg-surface-elevated px-4 py-2.5">
        <Search className="size-4 shrink-0 text-ink-faint" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search letters…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? <PageSpinner label="Opening your mailbox…" /> : null}

        {isError ? (
          <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-6 text-center">
            <p className="text-sm text-ink-soft">
              {error instanceof Error ? error.message : "We couldn't load your mailbox."}
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        {!isPending && !isError && filtered.length === 0 ? (
          <EmptyThreads searching={debounced.trim().length > 0} />
        ) : null}

        <ul className="space-y-1">
          {filtered.map((thread) => (
            <li key={thread.threadId}>
              <Link
                href={`/mailbox?thread=${thread.threadId}`}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors',
                  thread.threadId === threadId ? 'bg-primary-faint' : 'hover:bg-surface-muted',
                )}
              >
                <Avatar name={thread.profileDisplayName} src={thread.profilePhotoUrl} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm text-ink',
                        thread.unreadCount > 0 && 'font-bold',
                      )}
                    >
                      {thread.profileDisplayName}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {formatTime(thread.lastMessageAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
                    {thread.lastDirection === 'outbound' ? 'You: ' : ''}
                    {thread.lastMessagePreview ?? 'No letters yet'}
                  </span>
                </span>
                {thread.unreadCount > 0 ? (
                  <span className="size-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-center gap-2 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-faint">
        <Lock className="size-3.5 shrink-0 text-gold" />
        Private &amp; secure. Letters are printed and mailed; replies are scanned in by our team.
      </p>
    </div>
  );

  const composePane = composeAllowed && composeId ? (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Avatar name={composeName} className="size-10" />
        <span>
          <p className="font-[family-name:var(--font-bree)] text-lg text-ink">New letter</p>
          <p className="text-[13px] text-ink-soft">to {composeName}</p>
        </span>
      </header>
      <div className="space-y-4 p-5 lg:flex-1 lg:overflow-y-auto">
        <ComposeNote name={composeName} wordLimit={composeLimit?.wordLimit ?? null} />
        <LetterComposer
          tall
          placeholder={`Write your letter to ${composeName}…`}
          limit={composeLimit}
          disabled={!profileApproved}
          disabledReason={sendBlockedReason}
          onSend={(body) => sendLetter(composeId, body)}
        />
      </div>
    </div>
  ) : null;

  const readingPane = composePane ?? (
    threadId ? (
      <ThreadView
        threadId={threadId}
        onSend={sendLetter}
        canSend={Boolean(profileApproved)}
        cannotSendReason={sendBlockedReason}
      />
    ) : (
      <EmptyReadingPane />
    )
  );

  // On a phone the two panes are one screen at a time: the list, or whatever
  // is open on top of it, with a back link out.
  const detailOpen = Boolean(threadId || composePane);

  return (
    <div className="lg:flex lg:h-dvh lg:min-h-0">
      <div
        className={cn(
          'mx-auto w-full max-w-2xl px-5 py-6 lg:mx-0 lg:h-full lg:w-[380px] lg:max-w-none lg:shrink-0 lg:border-r lg:border-line lg:px-5',
          detailOpen && 'hidden lg:block',
        )}
      >
        <header className="mb-4 lg:hidden">
          <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">Mailbox</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Private &amp; secure{unread > 0 ? ` · ${unread} new` : ''}
          </p>
        </header>
        {listColumn}
      </div>

      <div className={cn('min-w-0 flex-1 lg:h-full', !detailOpen && 'hidden lg:block')}>
        {detailOpen ? (
          <Link
            href="/mailbox"
            className="flex items-center gap-1 px-4 pt-4 text-sm font-semibold text-primary lg:hidden"
          >
            <ChevronLeft className="size-4" />
            Mailbox
          </Link>
        ) : null}
        <div className="lg:h-full">{readingPane}</div>
      </div>
    </div>
  );
}

function EmptyThreads({ searching }: { searching: boolean }) {
  return (
    <div className="rounded-[--radius-card] border border-line bg-surface-elevated p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full border border-gold bg-gold-faint">
        <Mail className="size-6 text-gold" />
      </span>
      <p className="mt-4 font-[family-name:var(--font-bree)] text-lg text-ink">
        {searching ? 'No letters match that name' : 'No letters yet'}
      </p>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-ink-soft">
        {searching
          ? 'Try a different name, or clear the search to see everyone you write to.'
          : 'Find someone on the browse screen and write your first letter.'}
      </p>
      {searching ? null : (
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link href="/browse">Browse profiles</Link>
        </Button>
      )}
    </div>
  );
}

function EmptyReadingPane() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="grid size-16 place-items-center rounded-full border border-gold bg-gold-faint">
        <Mail className="size-7 text-gold" />
      </span>
      <p className="mt-5 font-[family-name:var(--font-bree)] text-xl text-ink">
        Your first letter starts here
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        Choose a letter to read it, or write one. We print and mail it for you, and scan their
        reply right back to this mailbox.
      </p>
      <Button asChild variant="secondary" className="mt-6">
        <Link href="/browse">Write a letter</Link>
      </Button>
    </div>
  );
}
