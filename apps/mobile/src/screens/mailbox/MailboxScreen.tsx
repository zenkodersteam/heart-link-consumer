import { FlashList } from '@shopify/flash-list';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Linking,
  TextInput,
  View,
  useWindowDimensions,
  BackHandler,
  PanResponder,
  RefreshControl,
} from 'react-native';

import type {
  LetterEntitlement,
  LetterLengthLimit,
  MailboxMessage,
  MailboxThreadDetail,
  MailboxThreadSummary,
  PublicProfileDetail,
} from '@heartlink/consumer-api';
import { stateName } from '@heartlink/consumer-api';
import { useRefresh } from '../../lib/use-refresh';
import { haptics } from '../../lib/haptics';
import { useApiClientFactory } from '../../lib/use-api-client';
import { useMyProfile } from '../../lib/use-my-profile';
import { PREVIEW_BYPASS_AUTH } from '../../lib/preview';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DropdownMenu } from '../../components/DropdownMenu';
import { ProfilePhoto } from '../../components/ProfilePhoto';
import { ProfileReviewOverlay } from '../../components/ProfileReviewOverlay';
import { art } from '../../art';
import { EmptyState } from '../../components/EmptyState';
import { openOnWeb, webAppUrl } from '../../components/SubscriptionPlans';
import { useToast } from '../../components/Toast';
import { useNavigation, useRoute } from '@react-navigation/native';

import type { RootNavigation, TabRoute } from '../../navigations/types';

import { colors, cta, fonts, radii, spacing, themedStyles, type } from '../../theme';
import {
  LettersCardSkeleton,
  ThreadDetailSkeleton,
  ThreadListSkeleton,
} from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { MailboxLocked } from '../../components/MailboxLocked';

/**
 * Secure Mailbox - PostGrid letter correspondence (real backend).
 *
 * Outbound = a typed letter we print + mail to the inmate's facility (addressed
 * server-side); inbound = the inmate's reply, scanned in by our team. NOT
 * real-time chat. Sending draws from a monthly letter allowance + purchased
 * credits.
 *
 * Framing is deliberately "secure & private" and NOT "end-to-end encrypted",
 * which is what the client screens print. These are physical letters: we print
 * and post them, our team scans the replies, and facility staff may read mail
 * under their own rules. Claiming end-to-end encryption here would be false,
 * and false in the direction that gets people hurt — see docs and the Privacy
 * & Safety screen, which say the same thing.
 */

/**
 * Inbox and Sent, from the direction of each thread's last letter.
 *
 * The screens draw an Archive tab as well. There is nothing behind it in the
 * API — no archive flag, no endpoint — and a tab that can only ever be empty
 * is worse than one that is not there, so it waits until there is something to
 * put in it.
 */
type MailFolder = 'inbox' | 'sent';

const FOLDERS: { key: MailFolder; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'sent', label: 'Sent' },
];

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  // A photo where there is one, initials otherwise: many correspondents have no
  // approved photo, and a broken image in a list of letters reads as a fault.
  if (uri) {
    return (
      <View style={[styles.avatar, shape, styles.avatarPhoto]}>
        <ProfilePhoto uri={uri} name={name} compact />
      </View>
    );
  }
  return (
    <View style={[styles.avatar, shape]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const DELIVERY_LABEL: Record<string, string> = {
  // Letters wait for staff review before they are ever printed, so the member
  // sees an honest first state rather than "sent".
  awaiting_approval: 'Awaiting review',
  rejected: 'Not approved',
  queued: 'Queued',
  submitted: 'Sent to print',
  printing: 'Printing',
  in_transit: 'In transit',
  delivered: 'Delivered',
  returned: 'Returned',
  failed: 'Failed',
};

const PREVIEW_MAILBOX_THREADS: MailboxThreadSummary[] = [
  {
    threadId: 'preview-thread-1',
    profileId: 'preview-1',
    profileDisplayName: 'Marcus T.',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
    lastMessagePreview: 'Keep telling me the truth then. Tell me what your mornings are like now.',
    lastMessageAt: '2026-07-21T14:35:00.000Z',
    lastDirection: 'inbound',
    unreadCount: 1,
  },
];

const PREVIEW_MAILBOX_DETAIL: MailboxThreadDetail = {
  threadId: 'preview-thread-1',
  profileId: 'preview-1',
  profileDisplayName: 'Marcus T.',
  profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80',
  messages: [
    {
      id: 'preview-msg-1',
      threadId: 'preview-thread-1',
      direction: 'outbound',
      body: "I keep thinking about what you said about wanting something honest. That's what I want too. My days are slow in here, but writing to you makes them feel like they're moving toward something.",
      subject: 'Thinking about your last letter',
      moderationStatus: 'approved',
    scanUrl: null,
      createdAt: '2026-07-18T10:15:00.000Z',
      deliveryStatus: 'delivered',
      readAt: '2026-07-19T19:42:00.000Z',
    },
    {
      id: 'preview-msg-2',
      threadId: 'preview-thread-1',
      direction: 'inbound',
      body: "That's exactly why I keep writing back. I don't need polished. I just want to know what your world actually feels like, and what kind of future you're still building toward.",
      subject: null,
      moderationStatus: 'approved',
    scanUrl: null,
      createdAt: '2026-07-19T19:42:00.000Z',
      deliveryStatus: null,
      readAt: '2026-07-20T08:00:00.000Z',
    },
    {
      id: 'preview-msg-3',
      threadId: 'preview-thread-1',
      direction: 'inbound',
      body: 'Tell me about your mornings, what you read when you can, and what you want your son to remember about who you are becoming.',
      subject: null,
      moderationStatus: 'approved',
    scanUrl: null,
      createdAt: '2026-07-21T14:35:00.000Z',
      deliveryStatus: null,
      readAt: null,
    },
  ],
};

const PREVIEW_LETTER_ENTITLEMENT: LetterEntitlement = {
  allowed: true,
  includedRemaining: 3,
  creditBalance: 1,
  totalRemaining: 4,
  capReached: false,
  includedPerPeriod: 5,
};

function deliveryLabel(status: string | null): string {
  if (!status) return '';
  return DELIVERY_LABEL[status] ?? status;
}


/** Count words the way the server does, so the two never disagree. */
function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function lettersLeftText(e: LetterEntitlement | null): string {
  if (!e) return '';
  const total = e.totalRemaining;
  if (total === null) return 'Unlimited letters';
  return `${total} letter${total === 1 ? '' : 's'} left`;
}

/**
 * The line under a name in the thread list.
 *
 * An inbound letter is scanned paper, so it carries no typed text to quote —
 * and "No messages yet" printed over a reply that has actually arrived reads
 * as the app having lost it.
 */
function threadPreview(thread: MailboxThreadSummary): string {
  if (thread.lastMessagePreview) return thread.lastMessagePreview;
  if (thread.lastDirection === 'inbound') return 'Scanned reply · tap to read';
  return 'No letters yet';
}

interface ComposeParam {
  profileId: string;
  name: string;
}

export default function MailboxScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const toast = useToast();
  const params = useRoute<TabRoute<'Mailbox'>>().params ?? {};

  const factory = useApiClientFactory();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  // Letters unlock once the member's own profile clears moderation. Read via a
  // ref so the sendLetter callback always sees the latest status.
  const { profile: myProfile, refresh: refreshMyProfile } = useMyProfile();
  const [recheckingProfile, setRecheckingProfile] = useState(false);
  const profileApproved = PREVIEW_BYPASS_AUTH || myProfile?.status === 'approved';
  const profileApprovedRef = useRef(profileApproved);
  profileApprovedRef.current = profileApproved;

  const [threads, setThreads] = useState<MailboxThreadSummary[]>([]);
  const [entitlement, setEntitlement] = useState<LetterEntitlement | null>(null);
  // Word limit is set by the recipient's plan, so it is fetched per profile.
  const [letterLimit, setLetterLimit] = useState<LetterLengthLimit | null>(null);
  // Pull to refresh. What is on this screen changes because of things that
  // happen off the device -- staff approving a letter, a reply being scanned
  // in -- so asking again without leaving the screen matters here.
  const [loading, setLoading] = useState(true);
  // The caught value, not a message: ErrorState decides the wording.
  const [error, setError] = useState<unknown>(null);
  // Free members are refused the mailbox by the API. That is a membership
  // state, not a failure, so it is tracked apart from `error` and gets its own
  // screen instead of "something went wrong" with a retry that cannot work.
  const [locked, setLocked] = useState(false);
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [search, setSearch] = useState('');
  // Debounced so filtering does not run on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(typeof params.thread === 'string' ? params.thread : null);
  const [detail, setDetail] = useState<MailboxThreadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Compose target from the Liked / profile "Message" button (no thread yet).
  // The mailbox is not a bypass around the liking/paywall flow: direct compose
  // links are accepted only for profiles that are currently in Liked.
  const composeParam: ComposeParam | null =
    typeof params.compose === 'string' && params.compose
      ? { profileId: params.compose, name: typeof params.name === 'string' ? params.name : 'this person' }
      : null;
  const [composing, setComposing] = useState<ComposeParam | null>(PREVIEW_BYPASS_AUTH ? composeParam : null);

  const canWriteToProfile = useCallback(async (profileId: string): Promise<boolean> => {
    if (PREVIEW_BYPASS_AUTH) return true;
    const client = await factoryRef.current();
    const saved = await client.listSavedProfiles();
    return saved.items.some((p) => p.id === profileId);
  }, []);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(false);
    try {
      if (PREVIEW_BYPASS_AUTH) {
        setThreads(PREVIEW_MAILBOX_THREADS);
        setEntitlement(PREVIEW_LETTER_ENTITLEMENT);
        return;
      }
      const client = await factoryRef.current();
      const [t, e] = await Promise.all([client.listMailboxThreads(), client.getLetterEntitlement()]);
      setThreads(t.items);
      setEntitlement(e);
    } catch (err) {
      if (PREVIEW_BYPASS_AUTH) {
        setThreads(PREVIEW_MAILBOX_THREADS);
        setEntitlement(PREVIEW_LETTER_ENTITLEMENT);
        setError(null);
      } else if ((err as { status?: number })?.status === 403) {
        // The one 403 this screen can get: no membership, no mailbox.
        setLocked(true);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, onRefresh } = useRefresh(
    useCallback(
      // Refetch both: the thread list, and the sender's own approval state,
      // since whether a letter can be sent at all depends on the latter.
      () => Promise.all([loadThreads(), refreshMyProfile()]),
      [loadThreads, refreshMyProfile],
    ),
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!composeParam) {
      setComposing(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const allowed = await canWriteToProfile(composeParam.profileId);
        if (!alive) return;
        if (allowed) {
          setSelectedThreadId(null);
          setDetail(null);
          setComposing(composeParam);
        } else {
          setComposing(null);
          toast.show('Like first', 'Like a profile before writing a letter.', undefined, 'info');
          navigation.navigate('Tabs', { screen: 'Mailbox' });
        }
      } catch {
        if (!alive) return;
        setComposing(null);
        toast.show('Could not start letter', 'Open this person from your Liked profiles and try again.');
        navigation.navigate('Tabs', { screen: 'Mailbox' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [composeParam?.profileId, composeParam?.name, canWriteToProfile, navigation, toast]);

  const openThread = useCallback(async (threadId: string) => {
    setComposing(null);
    setSelectedThreadId(threadId);
    setLoadingDetail(true);
    try {
      if (PREVIEW_BYPASS_AUTH && threadId === PREVIEW_MAILBOX_DETAIL.threadId) {
        setDetail(PREVIEW_MAILBOX_DETAIL);
        setThreads((prev) => prev.map((t) => (t.threadId === threadId ? { ...t, unreadCount: 0 } : t)));
        return;
      }
      const client = await factoryRef.current();
      const d = await client.getMailboxThread(threadId);
      setDetail(d);
      // Mark read + clear the unread badge locally.
      void client.markMailboxThreadRead(threadId).catch(() => undefined);
      setThreads((prev) => prev.map((t) => (t.threadId === threadId ? { ...t, unreadCount: 0 } : t)));
    } catch {
      if (PREVIEW_BYPASS_AUTH && threadId === PREVIEW_MAILBOX_DETAIL.threadId) {
        setDetail(PREVIEW_MAILBOX_DETAIL);
        setThreads((prev) => prev.map((t) => (t.threadId === threadId ? { ...t, unreadCount: 0 } : t)));
      } else {
        setDetail(null);
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (typeof params.thread === 'string' && params.thread && !detail && !loadingDetail) {
      void openThread(params.thread);
    }
  }, [params.thread, detail, loadingDetail, openThread]);

  /**
   * The person a thread is with, for the header above their letters.
   *
   * The thread payload carries only a name, and a name on its own leaves the
   * reader checking they opened the right conversation. Age and state come
   * from the public profile — the facility itself is deliberately not shown
   * anywhere in the app.
   */
  const [peer, setPeer] = useState<PublicProfileDetail | null>(null);
  /**
   * Why the profile is missing, when it is.
   *
   * A 404 here is not an error to hide: it means the listing has stopped being
   * public — the plan lapsed, or staff withdrew it. That happens to real
   * correspondence, and saying nothing left the thread looking identical to one
   * whose profile simply had no photo, so a member could keep writing to
   * someone who can no longer receive it and never be told why.
   */
  const [peerState, setPeerState] = useState<'loading' | 'ok' | 'unavailable' | 'error'>('loading');
  useEffect(() => {
    const id = detail?.profileId;
    if (!id) {
      setPeer(null);
      setPeerState('loading');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const client = await factoryRef.current();
        const p = await client.getPublicProfile(id);
        if (!cancelled) {
          setPeer(p);
          setPeerState('ok');
        }
      } catch (e) {
        if (cancelled) return;
        setPeer(null);
        // 404 is "no longer listed" and is worth saying. Anything else is a
        // failure to reach us, which is ours to fix and not theirs to read
        // about — the header just shows the name, as it did before.
        setPeerState((e as { status?: number })?.status === 404 ? 'unavailable' : 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail?.profileId]);

  const blockPeer = useCallback(
    async (profileId: string) => {
      try {
        const client = await factoryRef.current();
        await client.blockProfile(profileId);
        toast.show('Blocked', 'You will not hear from this person again.');
        setSelectedThreadId(null);
        setDetail(null);
        void loadThreads();
      } catch {
        toast.error('Could not block', 'Please try again in a moment.');
      }
    },
    [toast, loadThreads],
  );

  const closeThread = useCallback(() => {
    setSelectedThreadId(null);
    setDetail(null);
  }, []);

  /**
   * Leaving an open letter, the way the platform does it.
   *
   * An open thread is state on this screen rather than a pushed route, so
   * nothing gives us the stack's own back gesture for free — the two ways out
   * a phone user reaches for have to be wired by hand: the Android system back
   * button, and a swipe from the left edge.
   */
  useEffect(() => {
    if (!selectedThreadId || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeThread();
      return true;
    });
    return () => sub.remove();
  }, [selectedThreadId, closeThread]);

  const closeThreadRef = useRef(closeThread);
  closeThreadRef.current = closeThread;
  const edgeSwipe = useMemo(
    () =>
      PanResponder.create({
        // Claimed only for a clearly horizontal drag that began near the left
        // edge, so the letters underneath still scroll normally.
        onMoveShouldSetPanResponder: (_evt, g) =>
          g.dx > 12 && Math.abs(g.dy) < 12 && g.moveX - g.dx < 44,
        onPanResponderRelease: (_evt, g) => {
          if (g.dx > 80 || g.vx > 0.4) closeThreadRef.current();
        },
      }),
    [],
  );

  // Load the word limit for whoever is being written to. The limit belongs to
  // the recipient's plan, so it changes with the open thread / compose target.
  const limitProfileId = composing?.profileId ?? detail?.profileId ?? null;
  useEffect(() => {
    if (!limitProfileId) {
      setLetterLimit(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const client = await factoryRef.current();
        const lim = await client.getLetterLimit(limitProfileId);
        if (!cancelled) setLetterLimit(lim);
      } catch {
        // Advisory only: without it the counter just shows a plain word count,
        // and the server still enforces the real limit on send.
        if (!cancelled) setLetterLimit(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limitProfileId]);

  // Returning from checkout: credits are granted by the payment webhook, so
  // refresh the balance rather than assuming it changed.
  useEffect(() => {
    if (params.purchase === 'success') {
      toast.show('Letters added', 'Your new letters are ready to use.');
      void loadThreads();
    }
  }, [params.purchase, toast, loadThreads]);

  // Send a letter (reply within a thread, or a new letter to a compose target).
  const sendLetter = useCallback(
    async (profileId: string, body: string, threadId?: string): Promise<boolean> => {
      if (!profileApprovedRef.current) {
        toast.show(
          'Profile in review',
          'Letters unlock once our team approves your profile, usually within a day.',
          undefined,
          'info',
        );
        return false;
      }
      try {
        const allowed = await canWriteToProfile(profileId);
        if (!allowed) {
          toast.show('Like first', 'Like a profile before writing a letter.');
          return false;
        }
      } catch {
        toast.show('Could not verify liked status', 'Open this person from your Liked profiles and try again.');
        return false;
      }
      const client = await factoryRef.current();
      const res = await client.composeLetter(profileId, { body });
      setEntitlement(res.entitlement);
      if (!res.sent) {
        toast.show(
          'Out of letters',
          'You have used your letters for this period. Buy more from Account.',
          undefined,
          'info',
        );
        return false;
      }
      // Letters now wait for staff review before printing, so promising
      // "printing and mailing now" would be untrue.
      toast.show('Letter sent for review', 'Our team checks every letter before it is printed and posted.');
      // Refresh the open thread + the thread list.
      if (threadId) await openThread(threadId);
      await loadThreads();
      return true;
    },
    [toast, openThread, loadThreads, canWriteToProfile],
  );

  const filteredThreads = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return threads
      .filter((t) =>
        folder === 'sent' ? t.lastDirection === 'outbound' : t.lastDirection !== 'outbound',
      )
      .filter((t) => !q || t.profileDisplayName.toLowerCase().includes(q));
  }, [threads, folder, debouncedSearch]);

  const totalUnread = threads.reduce((n, t) => n + t.unreadCount, 0);

  // ----- shared sub-views -------------------------------------------------

  function ThreadList({ onPick, flush }: { onPick: (id: string) => void; flush?: boolean }) {
    if (loading) return <ThreadListSkeleton />;
    if (error) {
      return (
        <ErrorState
          error={error}
          fallback="We couldn't load your mailbox just now."
          onRetry={() => void loadThreads()}
          compact
        />
      );
    }
    if (filteredThreads.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Feather name="mail" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No letters yet</Text>
          <Text style={styles.emptyBody}>Find someone on the browse screen and tap Message to write your first letter.</Text>
          <Pressable onPress={() => navigation.navigate('Tabs')} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Browse profiles</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <FlashList
        data={filteredThreads}
        keyExtractor={(t) => t.threadId}
        // Rows are one fixed height: avatar, name, one-line preview.
        estimatedItemSize={76}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.threadListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        renderItem={({ item: t }) => (
          <Pressable
            onPress={() => {
              haptics.selection();
              onPick(t.threadId);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Letters with ${t.profileDisplayName}${t.unreadCount > 0 ? `, ${t.unreadCount} unread` : ''}`}
            style={({ pressed }: { pressed: boolean }) => [
              styles.msgRow,
              flush ? styles.msgRowFlush : null,
              t.threadId === selectedThreadId ? styles.msgRowActive : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            <Avatar name={t.profileDisplayName} uri={t.profilePhotoUrl} />
            <View style={styles.msgBody}>
              <View style={styles.msgTopline}>
                <Text style={[styles.msgName, t.unreadCount > 0 ? styles.msgNameUnread : null]} numberOfLines={1}>
                  {t.profileDisplayName}
                </Text>
                <Text style={styles.msgTime}>{formatTime(t.lastMessageAt)}</Text>
              </View>
              <Text style={styles.msgPreview} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                {t.lastDirection === 'outbound' ? 'You: ' : ''}
                {threadPreview(t)}
              </Text>
            </View>
            {t.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
      />
    );
  }

  function LettersWidget() {
    // Hold the card's shape until the allowance is known, rather than drawing
    // it with an empty heading and snapping to the numbers a moment later.
    if (profileApproved && entitlement === null) {
      // Reserve the buy button's space too: most members have a limited
      // allowance, so it is the shape the card usually settles into.
      return <LettersCardSkeleton />;
    }
    if (!profileApproved) {
      return (
        <View style={[styles.lettersCard, { borderColor: colors.gold, backgroundColor: colors.goldFaint }]}>
          <View style={styles.lettersTop}>
            <Feather name="clock" size={14} color={colors.gold} />
            <Text style={styles.lettersTitle}>Your profile is in review</Text>
          </View>
          <Text style={styles.lettersMeta}>
            Letters unlock as soon as our team approves your profile, usually within a day.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.lettersCard}>
        <View style={styles.lettersTop}>
          <Feather name="send" size={14} color={colors.primary} />
          <Text style={styles.lettersTitle}>{lettersLeftText(entitlement)}</Text>
        </View>
        {entitlement ? (
          <Text style={styles.lettersMeta}>
            {entitlement.includedRemaining === null
              ? 'Unlimited on your plan'
              : `${entitlement.includedRemaining} included this month`}
            {entitlement.creditBalance > 0 ? ` + ${entitlement.creditBalance} purchased` : ''}
          </Text>
        ) : null}

        {entitlement?.totalRemaining !== null ? (
          // Bought on the website, not here. Memberships and letter packs are
          // sold in one place so there is a single record of what someone has
          // paid for — and the phone app has no checkout of its own.
          <Pressable
            onPress={() => void openOnWeb(webAppUrl('/mailbox'))}
            style={({ pressed }: { pressed: boolean }) => [
              styles.buyBtn,
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Feather name="external-link" size={13} color={colors.primary} />
            <Text style={styles.buyBtnText}>Buy more letters on the web</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const PrivacyNote = (
    <View style={styles.encNote}>
      <Feather name="lock" size={14} color={colors.gold} />
      <Text style={styles.encNoteText}>Secure &amp; private. Letters are printed and mailed; replies are scanned in by our team.</Text>
    </View>
  );

  // ----- desktop ----------------------------------------------------------

  if (isDesktop) {
    return (
      <View style={styles.deskRoot}>
        {/* Same overlay on the wide layout, which is a separate return. */}
        {locked ? <MailboxLocked onSeePlans={() => void openOnWeb(webAppUrl('/plans'))} /> : null}

        {/* Notion Mail split (mockup): ONE list column carrying compose,
            quota, search, and threads; reading pane fills the rest. */}
        <View style={styles.listCol}>
          <View style={styles.listColTop}>
            <Pressable
              onPress={() => navigation.navigate('Tabs')}
              style={({ pressed }: { pressed: boolean }) => [
                styles.composeBtn,
                pressed ? { transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <Feather name="edit-3" size={16} color={colors.onPrimary} />
              <Text style={styles.composeText}>Write a new letter</Text>
            </Pressable>
            <LettersWidget />
          </View>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search letters…"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          {/* The list owns the scroll now, so it can recycle rows; the pull to
              refresh moved onto it with the scrolling. */}
          <View style={styles.threadListFill}>
            <ThreadList onPick={openThread} />
          </View>
          <View style={styles.listColBottom}>{PrivacyNote}</View>
        </View>

        <View style={styles.readCol}>
          {composing ? (
            <ComposePane
              target={composing}
              onSend={(body) => sendLetter(composing.profileId, body)}
              onCancel={() => setComposing(null)}
              limit={letterLimit}
              allowance={<LettersWidget />}
            />
          ) : loadingDetail ? (
            <ThreadDetailSkeleton />
          ) : detail ? (
            <ThreadView
              detail={detail}
              peer={peer}
              peerState={peerState}
              onReply={(body) => sendLetter(detail.profileId, body, detail.threadId)}
              onOpenProfile={() => navigation.navigate('Profile', { id: detail.profileId })}
              onBlock={() => void blockPeer(detail.profileId)}
              limit={letterLimit}
            />
          ) : (
            <EmptyState
              art={art.emptyMailbox}
              title="Your first letter starts here"
              body="Choose a letter to read it, or write one. We print and mail it for you, and scan their reply right back to this mailbox."
              ctaLabel="Write a letter"
              onPress={() => navigation.navigate('Tabs')}
            />
          )}
        </View>
      </View>
    );
  }

  // ----- mobile -----------------------------------------------------------

  if (composing) {
    return (
      <View style={styles.mobRoot}>
        <Pressable onPress={() => setComposing(null)} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={colors.primary} />
          <Text style={styles.backText}>Mailbox</Text>
        </Pressable>
        <ComposePane
          target={composing}
          onSend={(body) => sendLetter(composing.profileId, body)}
          onCancel={() => setComposing(null)}
          limit={letterLimit}
          allowance={<LettersWidget />}
        />
      </View>
    );
  }

  if (selectedThreadId) {
    return (
      // No breadcrumb above the letter: the person's own header is the top of
      // this screen, and getting out is the system back button or a swipe from
      // the left edge. The web build has neither, so it keeps a chevron inside
      // the header instead.
      <View style={styles.mobThreadRoot} {...edgeSwipe.panHandlers}>
        {loadingDetail ? (
          <ThreadDetailSkeleton />
        ) : detail ? (
          <ThreadView
            detail={detail}
            peer={peer}
            peerState={peerState}
            onReply={(body) => sendLetter(detail.profileId, body, detail.threadId)}
            onOpenProfile={() => navigation.navigate('Profile', { id: detail.profileId })}
            onBlock={() => void blockPeer(detail.profileId)}
            onBack={closeThread}
            flush
            limit={letterLimit}
          />
        ) : (
          <Text style={styles.emptyList}>Could not open this letter.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.mobRoot, styles.mobListRoot]}>
      {/* Over the mailbox, not instead of it: the folders and the shape of the
          list stay visible through the blur, so what a membership buys is the
          thing behind the glass rather than a description of it. Out to the
          website because paying happens there — a phone screen leading to
          another phone screen that then opens a browser is a hop of nothing. */}
      {locked ? <MailboxLocked onSeePlans={() => void openOnWeb(webAppUrl('/plans'))} /> : null}

      <View style={styles.mobHeader}>
        <View>
          <Text style={type.h1}>Mailbox</Text>
          <View style={styles.encLine}>
            <Feather name="lock" size={12} color={colors.textMuted} />
            <Text style={styles.readTo}>
              Secure &amp; private
              {totalUnread > 0 ? ` · ${totalUnread} new` : ''}
              {lettersLeftText(entitlement) ? ` · ${lettersLeftText(entitlement)}` : ''}
            </Text>
          </View>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Tabs')}
          style={({ pressed }: { pressed: boolean }) => [styles.composeFab, pressed ? { transform: [{ scale: 0.94 }] } : null]}
        >
          <Feather name="edit-3" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={[styles.folderTabs, styles.folderTabsFlush]}>
        {FOLDERS.map((f) => {
          const active = folder === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                haptics.selection();
                setFolder(f.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.folderTab, active ? styles.folderTabActive : null]}
            >
              <Text style={[styles.folderTabText, active ? styles.folderTabTextActive : null]}>
                {f.label}
              </Text>
              {f.key === 'inbox' && totalUnread > 0 ? (
                <View style={styles.folderBadge}>
                  <Text style={styles.folderBadgeText}>{totalUnread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.searchRow, styles.searchRowFlush]}>
        <Feather name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search letters…"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <ThreadList onPick={openThread} flush />
      </ScrollView>

      {!profileApproved && myProfile ? (
        <ProfileReviewOverlay
          status={myProfile.status}
          moderationNotes={myProfile.moderationNotes}
          refreshing={recheckingProfile}
          onEditProfile={() => navigation.navigate('Onboarding')}
          onRefresh={async () => {
            setRecheckingProfile(true);
            try {
              await refreshMyProfile();
            } finally {
              setRecheckingProfile(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}

function ThreadView({
  detail,
  peer,
  peerState,
  onReply,
  onOpenProfile,
  onBlock,
  onBack,
  flush,
  limit,
}: {
  detail: MailboxThreadDetail;
  /** The public profile behind the thread, once it has loaded. */
  peer: PublicProfileDetail | null;
  /** Why `peer` is null, so the header can say when a listing has ended. */
  peerState: 'loading' | 'ok' | 'unavailable' | 'error';
  onReply: (body: string) => Promise<boolean>;
  onOpenProfile: () => void;
  onBlock: () => void;
  /**
   * Only drawn on the web build. A phone leaves this thread by its own back
   * gesture; a browser has no such gesture, and this is state rather than a
   * URL, so without a control there is no way back to the list.
   */
  onBack?: () => void;
  /**
   * Phone layout: the header is the top of the screen, so it runs edge to edge
   * and its rule meets the one under the app's own top bar.
   */
  flush?: boolean;
  limit: LetterLengthLimit | null;
}) {
  /**
   * Why this correspondent cannot be written to, if they cannot.
   *
   * Taken from the peer the header already loaded, so the box agrees with the
   * banner above it. Checked before anything about the sender: being able to
   * write letters does not help when the person at the other end no longer has
   * a listing to receive them.
   */
  const blockedReason =
    peerState === 'unavailable'
      ? 'This listing is no longer active, so letters can no longer be delivered.'
      : peer && !peer.acceptsMail
        ? `${detail.profileDisplayName} is not accepting letters at the moment.`
        : null;

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const overLimit = limit?.wordLimit != null && countWords(reply) > limit.wordLimit;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<View | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const messagesRef = useRef<FlashList<MailboxMessage>>(null);
  /**
   * The thread, newest first, for the inverted list.
   *
   * The API returns a correspondence in the order it happened, which is the
   * order it reads in; the list draws it upside down so the latest letter is
   * the one on screen.
   */
  const newestFirst = useMemo(() => [...detail.messages].reverse(), [detail.messages]);

  // Age and state, whichever of them we have. The facility name is not shown:
  // the client's own privacy decision keeps it off every member-facing screen.
  const peerMeta = [
    peer?.age != null ? `${peer.age}` : null,
    peer?.facility?.state ? stateName(peer.facility.state) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  async function submit() {
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const ok = await onReply(body);
      if (ok) setReply('');
    } finally {
      setSending(false);
    }
  }

  return (
    // A plain View: the tab shell now gives back the height the keyboard takes,
    // so the reply box is already above it. A KeyboardAvoidingView here would
    // measure the same space a second time and lift the thread twice.
    <View style={[styles.readInner, flush ? styles.readInnerFlush : null]}>
      {/* Who this is, and the way out of the thread — the shape the client
          screens draw: portrait, name over a line of detail, overflow on the
          far right. Tapping the person opens their profile, which is where
          reporting lives. */}
      <View style={[styles.readHeader, flush ? styles.readHeaderFlush : null]}>
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel={`View ${detail.profileDisplayName}'s profile`}
          style={({ pressed }: { pressed: boolean }) => [
            styles.readSender,
            pressed ? { opacity: 0.75 } : null,
          ]}
        >
          <Avatar name={detail.profileDisplayName} uri={peer?.primaryPhotoUrl ?? null} size={46} />
          <View style={styles.readSenderText}>
            <Text style={styles.readSenderName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {detail.profileDisplayName}
            </Text>
            {peerMeta ? (
              <Text style={styles.readSenderMeta} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                {peerMeta}
              </Text>
            ) : null}
            {peerState === 'unavailable' ? (
              <Text style={styles.readSenderGone} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                This listing is no longer active
              </Text>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          ref={menuBtnRef}
          onPress={() => {
            // Measured, so the menu hangs under the button rather than from a
            // guessed offset that could land on top of it.
            menuBtnRef.current?.measureInWindow?.((x, y, w, h) => {
              setMenuAnchor({ top: y + h + 8, right: spacing.lg });
              setMenuOpen(true);
            });
            if (!menuBtnRef.current?.measureInWindow) setMenuOpen(true);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={({ pressed }: { pressed: boolean }) => [
            styles.readMenuBtn,
            pressed ? { transform: [{ scale: 0.94 }] } : null,
          ]}
        >
          <Feather name="more-horizontal" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <DropdownMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuAnchor}
        items={[
          { label: 'View profile', icon: 'user', onPress: onOpenProfile },
          {
            label: 'Block this person',
            icon: 'slash',
            destructive: true,
            separated: true,
            onPress: () => setBlockOpen(true),
          },
        ]}
      />

      <ConfirmDialog
        open={blockOpen}
        icon="slash"
        title={`Block ${detail.profileDisplayName}?`}
        message="Their letters stop reaching your mailbox, and you will not see this profile again. You can undo this from Blocked profiles."
        actions={[
          {
            label: 'Block',
            destructive: true,
            onPress: () => {
              setBlockOpen(false);
              onBlock();
            },
          },
        ]}
        onCancel={() => setBlockOpen(false)}
      />

      {/* Opens on the newest letter, and follows one that arrives or is sent —
          the way you pick up a pile of post. Without this the thread opened at
          the oldest message and stayed there, so a reply that had just been
          sent was somewhere below the fold.

          `onContentSizeChange` rather than an effect on the message count: the
          scroll has to happen once the new bubble has been laid out, and its
          height is not known before that. */}
      {/* A correspondence has no ceiling on its length, so the letters recycle
          like every other list in the app.

          Inverted, which is what makes the newest letter the one you land on.
          The obvious version - render oldest-first and scroll to the end after
          layout - is a race the list wins about half the time: a virtualized
          list only knows an estimate of its own height on the first frame, so
          the scroll lands short and the newest letters sit below the fold,
          behind the reply box. Turning the list upside down and feeding it the
          letters newest-first means "the start" and "the newest" are the same
          place, and there is nothing to scroll. Following a letter that arrives
          while you read comes free with it, and so does keeping your place when
          you are further up. */}
      <FlashList
        ref={messagesRef}
        data={newestFirst}
        inverted
        keyExtractor={(m) => m.id}
        // Letters vary from a line to several paragraphs; this is the median
        // bubble, which is what the estimate is for.
        estimatedItemSize={140}
        style={styles.readBodyScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
        renderItem={({ item: m }) => (
          <View style={styles.messageSpacing}>
            <MessageBubble message={m} />
          </View>
        )}
      />

      <View style={styles.replyBox}>
        <TextInput
          style={[styles.replyInput]}
          placeholder={blockedReason ? 'Letters cannot be sent to this listing' : 'Write a letter…'}
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!blockedReason}
          value={reply}
          onChangeText={setReply}
        />
        {/* Counter and button share one row. They were stacked, which left a
            band of empty box between the words and the way to send them. */}
        <View style={styles.replyFooter}>
          {/* Closed boxes say why. Counting words nobody can send tells the
              reader nothing, and pressing Send used to answer with the
              server's own "Profile <uuid> not found". */}
          {blockedReason ? (
            <Text style={styles.replyBlocked}>{blockedReason}</Text>
          ) : (
            <WordCount text={reply} limit={limit} />
          )}
          <Pressable
            hitSlop={8}
            onPress={submit}
            disabled={Boolean(blockedReason) || sending || reply.trim().length === 0 || overLimit}
            style={({ pressed }: { pressed: boolean }) => [
              styles.sendBtn,
              blockedReason || reply.trim().length === 0 || overLimit ? { opacity: 0.5 } : null,
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Feather name="send" size={15} color={colors.onPrimary} />
            )}
            <Text style={styles.sendText}>Send letter</Text>
          </Pressable>
        </View>
      </View>

      {/* Said once, where it matters: this is not a message that arrives in a
          second, and knowing that before writing changes what people write. */}
      <View style={styles.replyHint}>
        <Feather name="info" size={12} color={colors.textMuted} />
        <Text style={styles.replyHintText}>
          Checked by our team, then printed and posted. Replies are scanned back here.
        </Text>
      </View>
    </View>
  );
}

/**
 * Live word count against the recipient's plan limit.
 *
 * Advisory only — the server re-checks and is the real gate. Its job is to stop
 * a member writing 400 words before finding out the limit was 200.
 */
function WordCount({ text, limit }: { text: string; limit: LetterLengthLimit | null }) {
  const words = countWords(text);
  if (!limit || limit.wordLimit === null) {
    return words > 0 ? <Text style={styles.wordCount}>{words} words</Text> : null;
  }
  const over = words > limit.wordLimit;
  return (
    <Text style={[styles.wordCount, over ? styles.wordCountOver : null]}>
      {words} / {limit.wordLimit} words
      {over ? ` · ${words - limit.wordLimit} over the limit` : ''}
    </Text>
  );
}

/**
 * Inbound letters are scanned paper. The signed link is short-lived, so it is
 * opened on demand rather than embedded.
 */
function OriginalScanLink({ url }: { url: string }) {
  return (
    <Pressable
      onPress={() => { void Linking.openURL(url); }}
      style={({ pressed }: { pressed: boolean }) => [
        styles.scanLink,
        pressed ? { transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <Feather name="file-text" size={13} color={colors.primary} />
      <Text style={styles.scanLinkText}>View the original letter</Text>
    </Pressable>
  );
}

function MessageBubble({ message }: { message: MailboxMessage }) {
  const outbound = message.direction === 'outbound';
  return (
    <View style={[styles.bubbleWrap, outbound ? styles.bubbleWrapOut : styles.bubbleWrapIn]}>
      <View style={[styles.bubble, outbound ? styles.bubbleOut : styles.bubbleIn]}>
        {message.subject ? <Text style={[styles.bubbleSubject, outbound ? styles.bubbleTextOut : null]}>{message.subject}</Text> : null}
        {message.body ? (
          <Text style={[styles.bubbleBody, outbound ? styles.bubbleTextOut : null]}>{message.body}</Text>
        ) : message.scanUrl ? (
          // A scanned letter often has no typed text. Previously this rendered
          // an empty bubble, which is what made incoming letters look blank.
          <Text style={[styles.bubbleBody, styles.bubbleBodyMuted]}>
            This letter arrived as a scan.
          </Text>
        ) : null}
        {message.scanUrl ? <OriginalScanLink url={message.scanUrl} /> : null}
      </View>
      <Text style={styles.bubbleMeta}>
        {formatTime(message.createdAt)}
        {outbound && message.deliveryStatus ? ` · ${deliveryLabel(message.deliveryStatus)}` : ''}
      </Text>
    </View>
  );
}

/**
 * Letters in progress, by recipient.
 *
 * A module-level map rather than component state: the point is that the draft
 * outlives the screen. It does not outlive the app, which is a deliberate
 * limit - a letter is private, and writing it to disk is a decision to make
 * on purpose rather than as a side effect of a text box.
 */
const DRAFTS = new Map<string, string>();

function draftFor(profileId: string): string {
  return DRAFTS.get(profileId) ?? '';
}

function ComposePane({
  target,
  onSend,
  onCancel,
  limit,
  allowance,
}: {
  target: ComposeParam;
  onSend: (body: string) => Promise<boolean>;
  onCancel: () => void;
  limit: LetterLengthLimit | null;
  /**
   * The letters-left card, passed in rather than rendered here: it reads the
   * screen's own entitlement state, which lives a level up.
   */
  allowance?: ReactNode;
}) {
  // Restored on mount, so backing out to check something in the thread and
  // coming back does not cost the letter. Kept in memory rather than on disk:
  // it survives navigation, which is where it was actually being lost.
  const [body, setBody] = useState(() => draftFor(target.profileId));
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const overLimit = limit?.wordLimit != null && countWords(body) > limit.wordLimit;

  // "Saved" appears once the typing stops, not on every keystroke - a label
  // that flickers while you write is one more thing moving on the page.
  useEffect(() => {
    if (!body.trim()) {
      setSaved(false);
      return undefined;
    }
    setSaved(false);
    const t = setTimeout(() => {
      DRAFTS.set(target.profileId, body);
      setSaved(true);
    }, 700);
    return () => clearTimeout(t);
  }, [body, target.profileId]);

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const ok = await onSend(text);
      if (ok) {
        // No haptic here: the "Letter sent for review" toast carries it, and
        // two successes for one send is how a vocabulary starts to lie.
        DRAFTS.delete(target.profileId);
        setBody('');
        onCancel();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    // As in ThreadView: the shell has already made room for the keyboard, so
    // this is a plain View rather than a second layer of avoidance.
    <View style={styles.readInner}>
      <View style={styles.readHeader}>
        <View style={styles.readSender}>
          <Avatar name={target.name} size={40} />
          <View>
            <Text style={styles.readSenderName}>New letter</Text>
            <Text style={styles.readTo}>to {target.name}</Text>
          </View>
        </View>
      </View>

      {/* The allowance belongs here rather than over the list of letters: this
          is the screen where one gets spent, and it is the last moment it can
          change what someone does. */}
      {allowance ? <View style={styles.composeLetters}>{allowance}</View> : null}

      {/* The journey, as three words rather than a paragraph. It is the thing
          people most need to know before writing, and the thing they stop
          reading if it is a block of prose. */}
      <View style={styles.journey}>
        <View style={styles.journeySteps}>
          {['Reviewed', 'Printed', 'Posted'].map((step, i) => (
            <Fragment key={step}>
              {i > 0 ? <Feather name="chevron-right" size={12} color={colors.textMuted} /> : null}
              <Text style={styles.journeyStep}>{step}</Text>
            </Fragment>
          ))}
        </View>
        <Text style={styles.journeyTail}>Replies are scanned back into this thread.</Text>
      </View>

      {/* A sheet of paper, not a form field. The salutation is drawn, not
          typed, so the writer starts on the second line the way they would
          on paper — it is not part of the body that gets sent. */}
      <View style={styles.sheet}>
        <Text style={styles.sheetSalutation}>Dear {target.name.split(' ')[0]},</Text>
        <TextInput
          style={[styles.sheetInput]}
          placeholder="Tell them about your day, ask about theirs…"
          placeholderTextColor={colors.textMuted}
          multiline
          autoFocus
          value={body}
          onChangeText={setBody}
        />
        <View style={styles.sheetFooter}>
          <View style={styles.sheetMeta}>
            <WordCount text={body} limit={limit} />
            {saved ? (
              <View style={styles.savedRow}>
                <Feather name="check" size={11} color={colors.textMuted} />
                <Text style={styles.savedText}>Saved</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            hitSlop={8}
            onPress={submit}
            disabled={sending || body.trim().length === 0 || overLimit}
            style={({ pressed }: { pressed: boolean }) => [
              styles.sendBtn,
              body.trim().length === 0 || overLimit ? { opacity: 0.5 } : null,
              pressed ? { transform: [{ scale: 0.97 }] } : null,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Feather name="send" size={15} color={colors.onPrimary} />
            )}
            <Text style={styles.sendText}>Send letter</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  messagesContent: { paddingBottom: spacing.lg },
  messageSpacing: { marginBottom: spacing.md },
  threadListFill: { flex: 1, minHeight: 0 },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  savedText: { ...type.caption, fontSize: 11, color: colors.textMuted },
  threadListContent: { paddingBottom: spacing.lg },
  deskRoot: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent', position: 'relative' },
  listColTop: { padding: spacing.lg, paddingBottom: 0, gap: spacing.md },
  listColBottom: { padding: spacing.lg, paddingTop: spacing.md },
  composeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: spacing.md,
    boxShadow: cta.glow,
  },
  composeText: { ...type.button, color: colors.onPrimary, fontSize: 14 },

  lettersCard: { gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.bgElevated },
  lettersTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lettersTitle: { ...type.button, fontSize: 14, color: colors.textPrimary },
  lettersMeta: { ...type.caption, fontSize: 11 },

  encNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderColor: colors.goldFaint, backgroundColor: colors.goldFaint, borderRadius: radii.md, padding: spacing.md },
  encNoteText: { ...type.caption, color: colors.textSecondary, flex: 1, fontSize: 11 },

  listCol: { width: 300, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.surfaceCanvas },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.bgElevated },
  searchInput: { flex: 1, paddingVertical: spacing.md, color: colors.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14 },
  emptyList: { ...type.bodyMuted, textAlign: 'center', padding: spacing.xl },

  emptyWrap: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { ...type.h2, fontSize: 16 },
  emptyBody: { ...type.bodyMuted, fontSize: 13, textAlign: 'center' },
  emptyBtn: { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  emptyBtnText: { ...type.button, color: colors.onPrimary, fontSize: 13 },

  msgRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: 'transparent' },
  // Pulled out to the page edges so the selected row's tint and its left rule
  // reach them, while the text keeps the same left edge as the title and the
  // search box above it.
  msgRowFlush: { marginHorizontal: -spacing.lg },
  msgRowActive: { backgroundColor: colors.primaryFaint, borderLeftColor: colors.primary },
  msgBody: { flex: 1, gap: 1 },
  msgTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  msgName: { ...type.body, fontSize: 14, color: colors.textPrimary, flex: 1 },
  msgNameUnread: { fontFamily: 'Inter_700Bold' },
  msgTime: { ...type.caption, fontSize: 11 },
  msgPreview: { ...type.caption, fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  readCol: { flex: 1, minWidth: 0 },
  readEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  readInner: { flex: 1, padding: spacing.xl, gap: spacing.lg },
  // Nothing above the header on a phone, so the page's own top padding goes:
  // the header's rule is meant to sit directly under the top bar's.
  readInnerFlush: { paddingTop: 0 },
  readHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // `flex: 1` and `minWidth: 0` so a long name truncates instead of pushing the
  // overflow button off the row.
  readSender: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  // Pulled out to the screen edges so the rule under the header spans the full
  // width, the way the top bar's does.
  readHeaderFlush: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  readBackBtn: { marginLeft: -spacing.xs, marginRight: -spacing.xs },
  readSenderText: { flex: 1, minWidth: 0, gap: 1 },
  // Gold rather than red: the listing ending is not the member's mistake and
  // not a failure of the app, so it should read as a notice, not an alarm.
  readSenderGone: { ...type.caption, color: colors.gold, marginTop: 1 },
  readSenderName: { ...type.body, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  readSenderMeta: { ...type.caption, fontSize: 12 },
  readMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  encLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  readTo: { ...type.caption, fontSize: 12 },
  readBodyScroll: { flex: 1 },

  journey: { gap: 2 },
  journeySteps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  journeyStep: { ...type.caption, color: colors.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 11.5 },
  journeyTail: { ...type.caption, color: colors.textMuted, fontSize: 11.5 },

  sheet: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sheetSalutation: { ...type.body, fontSize: 15, color: colors.textPrimary, marginBottom: 2 },
  sheetInput: {
    flex: 1,
    textAlignVertical: 'top',
    color: colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },

  // message bubbles
  bubbleWrap: { maxWidth: '85%', gap: 2 },
  bubbleWrapOut: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapIn: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radii.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  bubbleOut: { backgroundColor: colors.primary, borderBottomRightRadius: radii.sm },
  bubbleIn: { backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radii.sm },
  bubbleSubject: { ...type.button, fontSize: 13, marginBottom: spacing.xs, color: colors.textPrimary },
  bubbleBody: { ...type.body, fontSize: 14, lineHeight: 22, color: colors.textPrimary },
  bubbleTextOut: { color: colors.onPrimary },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary },
  packList: { gap: 8, marginTop: spacing.md },
  packBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  packLetters: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary },
  packPrice: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.primary },
  wordCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  wordCountOver: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  scanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  scanLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.primary },
  bubbleBodyMuted: { fontStyle: 'italic', color: colors.textMuted },
  bubbleMeta: { ...type.caption, fontSize: 10, marginHorizontal: spacing.xs },

  replyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
  },
  replyBlocked: { ...type.caption, color: colors.gold, flex: 1, marginRight: spacing.sm },
  replyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  replyHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 6 },
  replyHintText: { ...type.caption, color: colors.textMuted, flex: 1, fontSize: 11.5 },
  replyInput: { minHeight: 76, color: colors.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  // `marginLeft: 'auto'` rather than leaning on the row's `space-between`: the
  // word count renders nothing until something is typed, so with an empty
  // field the button was the row's only child and space-between parked it on
  // the left, then jumped it right on the first keystroke.
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto', backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  sendText: { ...type.button, color: colors.onPrimary, fontSize: 13 },

  // mobile
  mobRoot: { flex: 1, padding: spacing.lg, gap: spacing.md },
  mobThreadRoot: { flex: 1 },
  // The list screen sets its own rhythm: one gap between every band, and no
  // double inset. The search row and the folder tabs carry margins of their own
  // for the desktop column, which inside this padded page put them 32pt from
  // the edge while the title sat at 16, and pushed the whole list down the
  // screen for no reason.
  mobListRoot: { paddingTop: spacing.md, gap: spacing.md },
  folderTabsFlush: { marginHorizontal: 0, marginTop: 0 },
  searchRowFlush: { margin: 0 },
  mobHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  composeLetters: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  folderTabs: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.md },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  folderTabActive: { backgroundColor: colors.primaryFaint },
  folderTabText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textMuted },
  folderTabTextActive: { color: colors.primary },
  folderBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  folderBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10.5, color: colors.onPrimary },
  avatarPhoto: { overflow: 'hidden' },
  composeFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(219, 2, 82,0.35)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { ...type.button, color: colors.primary, fontSize: 15 },

  avatar: { backgroundColor: colors.sidebar, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.sidebarText, fontFamily: 'Inter_700Bold' },
}));
