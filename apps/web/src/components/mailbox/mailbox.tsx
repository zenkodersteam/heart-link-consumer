'use client';

import { ChevronLeft, Mail, PenLine, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ProfileReviewOverlay } from '@/components/profile/review-overlay';
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

import { LettersCard } from './letters-card';
import { formatTime, threadPreview, type MailFolder } from './lib';
import { LetterComposer } from './letter-composer';
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
  const { data: myProfile, refetch: refetchProfile, isFetching: profileRefetching } = useMyProfile();
  const { data: saved } = useSavedProfiles();
  const { data: composeLimit } = useLetterLimit(composeId ?? undefined);
  const composeLetter = useComposeLetter();
  const { mutate: markThreadRead } = useMarkThreadRead();

  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Letters unlock once the member's own profile clears moderation.
  const profileApproved = myProfile?.status === 'approved';

  const threads = useMemo(() => data?.items ?? [], [data]);
  /**
   * Which folder a thread belongs in, from the direction of its last letter:
   * one you have replied to most recently sits in Sent, one waiting on you
   * sits in Inbox. A thread with nothing in it yet counts as Inbox.
   */
  const inFolder = useMemo(
    () =>
      threads.filter((thread) =>
        folder === 'sent'
          ? thread.lastDirection === 'outbound'
          : thread.lastDirection !== 'outbound',
      ),
    [threads, folder],
  );

  const filtered = useMemo(() => {
    const query = debounced.trim().toLowerCase();
    return query
      ? inFolder.filter((t) => t.profileDisplayName.toLowerCase().includes(query))
      : inFolder;
  }, [inFolder, debounced]);

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

  /**
   * The one column that carries the whole mailbox: what to do, where to look,
   * and every correspondence.
   *
   * It used to be two — a 230px rail of folders beside a list of threads —
   * which spent a third of a wide screen on two words and left both columns
   * too narrow to read. Compose, folders and the allowance now sit around the
   * list they belong to, the way a mail client stacks them.
   */
  const listColumn = (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-bree)] text-xl text-ink lg:text-lg">
            Letters
          </h1>
          <Button asChild size="sm">
            <Link href="/browse">
              <PenLine className="size-3.5" />
              Write
            </Link>
          </Button>
        </div>

        <label className="flex items-center gap-2 rounded-pill border border-line bg-surface-elevated px-3.5 py-2">
          <Search className="size-4 shrink-0 text-ink-faint" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search letters…"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
          />
        </label>

        {/* Inbox and Sent as two pills rather than a column of their own: the
            rail they came from held nothing else worth its width. Archive and
            Trash are not offered, since the API has nothing behind them and a
            folder that can never fill is worse than no folder. */}
        <div className="flex gap-1.5">
          {(['inbox', 'sent'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFolder(key)}
              aria-current={folder === key ? 'true' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] capitalize transition-colors',
                folder === key
                  ? 'bg-primary-faint font-semibold text-primary'
                  : 'text-ink-soft hover:bg-surface-muted',
              )}
            >
              {key}
              {key === 'inbox' && unread > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isPending ? <PageSpinner label="Opening your mailbox…" /> : null}

        {isError ? (
          <div className="m-2 rounded-card border border-line bg-surface-elevated p-6 text-center">
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

        <ul>
          {filtered.map((thread) => (
            <li key={thread.threadId}>
              <Link
                href={`/mailbox?thread=${thread.threadId}`}
                aria-current={thread.threadId === threadId ? 'true' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
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
                    {threadPreview(thread)}
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

      {/* The allowance sits at the foot, where a mail client puts storage: it
          is status, read before writing rather than acted on. */}
      <div className="px-4 pb-4">
        <LettersCard />
      </div>
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
          salutation={`Dear ${composeName.split(' ')[0]},`}
          placeholder="Tell them about your day, ask about theirs…"
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
    // `relative` so the overlay can cover exactly this pane rather than the
    // whole window: the rail and the tab bar stay usable, which is the point —
    // browsing is still allowed while a profile is in review, only the mailbox
    // is not.
    <div className="relative lg:flex lg:h-[calc(100dvh-3.8rem)] lg:min-h-0">
      {myProfile && myProfile.status !== 'approved' ? (
        <ProfileReviewOverlay
          status={myProfile.status}
          moderationNotes={myProfile.moderationNotes}
          onRefresh={() => void refetchProfile()}
          refreshing={profileRefetching}
        />
      ) : null}

      {/* Two panes, as a mail client has them: the list, and what is open.
          On a phone they are one screen at a time — the list, or the letter on
          top of it with a way back. */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-2xl flex-col lg:mx-0 lg:h-full lg:w-[360px] lg:max-w-none lg:shrink-0 lg:border-r lg:border-line',
          detailOpen && 'hidden lg:flex',
        )}
      >
        {/* One heading, not two: the column carries its own, and a phone-only
            "Mailbox" title above it stacked a second one on the same screen. */}
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

/**
 * Nothing in the list.
 *
 * Deliberately plain when the mailbox is simply empty: the reading pane beside
 * it already carries the full invitation, artwork and button included, so a
 * second bordered card saying the same thing made one empty mailbox look like
 * two separate problems. This just labels the empty column.
 *
 * An empty *search* is different — the pane still shows the standing
 * invitation, which does not explain why the list went blank — so that case
 * keeps its own explanation.
 */
function EmptyThreads({ searching }: { searching: boolean }) {
  if (!searching) {
    return (
      <p className="px-1 py-10 text-center text-[13px] text-ink-faint lg:py-8">
        No letters yet.
      </p>
    );
  }

  return (
    <div className="px-1 py-10 text-center lg:py-8">
      <p className="font-[family-name:var(--font-bree)] text-[15px] text-ink">
        No letters match that name
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-soft">
        Try a different name, or clear the search to see everyone you write to.
      </p>
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
