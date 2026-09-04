import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';

import type {
  LetterEntitlement,
  LetterLengthLimit,
  MailboxMessage,
  MailboxThreadDetail,
  MailboxThreadSummary,
} from '../../src/lib/api';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { useMyProfile } from '../../src/lib/use-my-profile';
import { PREVIEW_BYPASS_AUTH } from '../../src/lib/preview';
import { art } from '../../src/art';
import { EmptyState } from '../../src/components/EmptyState';
import { useToast } from '../../src/components/Toast';
import { colors, cta, radii, spacing, type } from '../../src/theme';

/**
 * Secure Mailbox - PostGrid letter correspondence (real backend).
 *
 * Outbound = a typed letter we print + mail to the inmate's facility (addressed
 * server-side); inbound = the inmate's reply, scanned in by our team. NOT
 * real-time chat. Sending draws from a monthly letter allowance + purchased
 * credits. Honest framing: "private & secure", no end-to-end-encryption claim.
 */

const webTransition =
  Platform.OS === 'web'
    ? { transitionProperty: 'background-color, border-color, transform', transitionDuration: '150ms', transitionTimingFunction: 'ease-out' }
    : null;

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
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

/**
 * Letter top-up packs. Mirrors the server's catalogue; the server is
 * authoritative on price and credits, this is only what the member is shown.
 */
const LETTER_PACKS: { key: 'small' | 'medium' | 'large'; letters: number; price: string }[] = [
  { key: 'small', letters: 3, price: '$4.99' },
  { key: 'medium', letters: 7, price: '$9.99' },
  { key: 'large', letters: 20, price: '$19.99' },
];

function checkoutOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://heart-link-consumer.vercel.app';
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

interface ComposeParam {
  profileId: string;
  name: string;
}

export default function MailboxScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ compose?: string; name?: string; thread?: string; purchase?: string }>();

  const factory = useApiClientFactory();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  // Letters unlock once the member's own profile clears moderation. Read via a
  // ref so the sendLetter callback always sees the latest status.
  const { profile: myProfile } = useMyProfile();
  const profileApproved = PREVIEW_BYPASS_AUTH || myProfile?.status === 'approved';
  const profileApprovedRef = useRef(profileApproved);
  profileApprovedRef.current = profileApproved;

  const [threads, setThreads] = useState<MailboxThreadSummary[]>([]);
  const [entitlement, setEntitlement] = useState<LetterEntitlement | null>(null);
  // Word limit is set by the recipient's plan, so it is fetched per profile.
  const [letterLimit, setLetterLimit] = useState<LetterLengthLimit | null>(null);
  const [showPacks, setShowPacks] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
      } else {
        setError(err instanceof Error ? err.message : 'Could not load your mailbox.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
          toast.show('Like first', 'Like a profile before writing a letter.');
          router.replace('/mailbox');
        }
      } catch {
        if (!alive) return;
        setComposing(null);
        toast.show('Could not start letter', 'Open this person from your Liked profiles and try again.');
        router.replace('/mailbox');
      }
    })();
    return () => {
      alive = false;
    };
  }, [composeParam?.profileId, composeParam?.name, canWriteToProfile, router, toast]);

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

  // Buy more letters. The API returns a hosted checkout link, or configured:false
  // when the payment processor is not wired up in this environment.
  const buyLetters = useCallback(
    async (pack: 'small' | 'medium' | 'large') => {
      setBuying(pack);
      try {
        const client = await factoryRef.current();
        const origin = checkoutOrigin();
        const res = await client.purchaseLetters({
          pack,
          processor: 'stripe',
          successUrl: `${origin}/mailbox?purchase=success`,
          cancelUrl: `${origin}/mailbox?purchase=cancel`,
        });
        if (res.configured && res.url) {
          await Linking.openURL(res.url);
        } else {
          toast.show('Not available yet', 'Buying letters is coming soon.');
        }
      } catch {
        toast.show('Could not start checkout', 'Please try again in a moment.');
      } finally {
        setBuying(null);
        setShowPacks(false);
      }
    },
    [toast],
  );

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
        toast.show('Out of letters', 'You have used your letters for this period. Buy more from Account.');
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
    const q = search.trim().toLowerCase();
    return threads.filter((t) => !q || t.profileDisplayName.toLowerCase().includes(q));
  }, [threads, search]);

  const totalUnread = threads.reduce((n, t) => n + t.unreadCount, 0);

  // ----- shared sub-views -------------------------------------------------

  function ThreadList({ onPick }: { onPick: (id: string) => void }) {
    if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
    if (error) return <Text style={styles.emptyList}>{error}</Text>;
    if (filteredThreads.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Feather name="mail" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No letters yet</Text>
          <Text style={styles.emptyBody}>Find someone on the browse screen and tap Message to write your first letter.</Text>
          <Pressable onPress={() => router.push('/(tabs)')} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Browse profiles</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <>
        {filteredThreads.map((t) => (
          <Pressable
            key={t.threadId}
            onPress={() => onPick(t.threadId)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.msgRow,
              webTransition,
              t.threadId === selectedThreadId ? styles.msgRowActive : null,
              hovered && t.threadId !== selectedThreadId ? { backgroundColor: colors.surfaceMuted } : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            <Avatar name={t.profileDisplayName} />
            <View style={styles.msgBody}>
              <View style={styles.msgTopline}>
                <Text style={[styles.msgName, t.unreadCount > 0 ? styles.msgNameUnread : null]} numberOfLines={1}>
                  {t.profileDisplayName}
                </Text>
                <Text style={styles.msgTime}>{formatTime(t.lastMessageAt)}</Text>
              </View>
              <Text style={styles.msgPreview} numberOfLines={1}>
                {t.lastDirection === 'outbound' ? 'You: ' : ''}
                {t.lastMessagePreview ?? 'No messages yet'}
              </Text>
            </View>
            {t.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        ))}
      </>
    );
  }

  function LettersWidget() {
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
          showPacks ? (
            <View style={styles.packList}>
              {LETTER_PACKS.map((pk) => (
                <Pressable
                  key={pk.key}
                  onPress={() => void buyLetters(pk.key)}
                  disabled={buying !== null}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.packBtn,
                    webTransition,
                    hovered ? { borderColor: colors.primary } : null,
                    pressed ? { transform: [{ scale: 0.98 }] } : null,
                    buying !== null && buying !== pk.key ? { opacity: 0.5 } : null,
                  ]}
                >
                  {buying === pk.key ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.packLetters}>{pk.letters} letters</Text>
                      <Text style={styles.packPrice}>{pk.price}</Text>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              onPress={() => setShowPacks(true)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.buyBtn,
                webTransition,
                hovered ? { opacity: 0.9 } : null,
                pressed ? { transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <Feather name="plus-circle" size={13} color={colors.primary} />
              <Text style={styles.buyBtnText}>Buy more letters</Text>
            </Pressable>
          )
        ) : null}
      </View>
    );
  }

  const PrivacyNote = (
    <View style={styles.encNote}>
      <Feather name="lock" size={14} color={colors.gold} />
      <Text style={styles.encNoteText}>Private &amp; secure. Letters are printed and mailed; replies are scanned in by our team.</Text>
    </View>
  );

  // ----- desktop ----------------------------------------------------------

  if (isDesktop) {
    return (
      <View style={styles.deskRoot}>
        {/* Notion Mail split (mockup): ONE list column carrying compose,
            quota, search, and threads; reading pane fills the rest. */}
        <View style={styles.listCol}>
          <View style={styles.listColTop}>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.composeBtn,
                webTransition,
                hovered ? { opacity: 0.92, transform: [{ translateY: -1 }] } : null,
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
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search letters…"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThreadList onPick={openThread} />
          </ScrollView>
          <View style={styles.listColBottom}>{PrivacyNote}</View>
        </View>

        <View style={styles.readCol}>
          {composing ? (
            <ComposePane
              target={composing}
              onSend={(body) => sendLetter(composing.profileId, body)}
              onCancel={() => setComposing(null)}
              limit={letterLimit}
            />
          ) : loadingDetail ? (
            <View style={styles.readEmpty}><ActivityIndicator color={colors.primary} /></View>
          ) : detail ? (
            <ThreadView
              detail={detail}
              onReply={(body) => sendLetter(detail.profileId, body, detail.threadId)}
              limit={letterLimit}
            />
          ) : (
            <EmptyState
              art={art.emptyMailbox}
              title="Your first letter starts here"
              body="Choose a letter to read it, or write one. We print and mail it for you, and scan their reply right back to this mailbox."
              ctaLabel="Write a letter"
              onPress={() => router.push('/(tabs)')}
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
        />
      </View>
    );
  }

  if (selectedThreadId) {
    return (
      <View style={styles.mobRoot}>
        <Pressable onPress={() => { setSelectedThreadId(null); setDetail(null); }} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={colors.primary} />
          <Text style={styles.backText}>Mailbox</Text>
        </Pressable>
        {loadingDetail ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : detail ? (
          <ThreadView
            detail={detail}
            onReply={(body) => sendLetter(detail.profileId, body, detail.threadId)}
            limit={letterLimit}
          />
        ) : (
          <Text style={styles.emptyList}>Could not open this letter.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.mobRoot}>
      <View style={styles.mobHeader}>
        <View>
          <Text style={type.h1}>Mailbox</Text>
          <View style={styles.encLine}>
            <Feather name="lock" size={12} color={colors.textMuted} />
            <Text style={styles.readTo}>Private &amp; secure{totalUnread > 0 ? ` · ${totalUnread} new` : ''}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={({ pressed }: { pressed: boolean }) => [styles.composeFab, pressed ? { transform: [{ scale: 0.94 }] } : null]}
        >
          <Feather name="edit-3" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search letters…"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.mobLettersRow}>
        <LettersWidget />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <ThreadList onPick={openThread} />
      </ScrollView>
    </View>
  );
}

function ThreadView({
  detail,
  onReply,
  limit,
}: {
  detail: MailboxThreadDetail;
  onReply: (body: string) => Promise<boolean>;
  limit: LetterLengthLimit | null;
}) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const overLimit = limit?.wordLimit != null && countWords(reply) > limit.wordLimit;

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
    <View style={styles.readInner}>
      <View style={styles.readHeader}>
        <View style={styles.readSender}>
          <Avatar name={detail.profileDisplayName} size={40} />
          <Text style={styles.readSenderName}>{detail.profileDisplayName}</Text>
        </View>
      </View>

      <ScrollView style={styles.readBodyScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
        {detail.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </ScrollView>

      <View style={styles.replyBox}>
        <TextInput
          style={styles.replyInput}
          placeholder="Write a letter…"
          placeholderTextColor={colors.textMuted}
          multiline
          value={reply}
          onChangeText={setReply}
        />
        <WordCount text={reply} limit={limit} />
        <Pressable
          onPress={submit}
          disabled={sending || reply.trim().length === 0 || overLimit}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.sendBtn,
            webTransition,
            reply.trim().length === 0 || overLimit ? { opacity: 0.5 } : null,
            hovered ? { opacity: 0.92 } : null,
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
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.scanLink,
        webTransition,
        hovered ? { opacity: 0.85 } : null,
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

function ComposePane({
  target,
  onSend,
  onCancel,
  limit,
}: {
  target: ComposeParam;
  onSend: (body: string) => Promise<boolean>;
  onCancel: () => void;
  limit: LetterLengthLimit | null;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const overLimit = limit?.wordLimit != null && countWords(body) > limit.wordLimit;

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const ok = await onSend(text);
      if (ok) {
        setBody('');
        onCancel();
      }
    } finally {
      setSending(false);
    }
  }

  return (
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

      <View style={styles.composeNote}>
        <Feather name="info" size={13} color={colors.textMuted} />
        <Text style={styles.composeNoteText}>
          Our team reviews every letter, then it is printed and mailed to the facility.
          Replies are scanned back into this thread.
          {limit?.wordLimit != null ? ` Letters to ${target.name} can be up to ${limit.wordLimit} words.` : ''}
        </Text>
      </View>

      <View style={[styles.replyBox, { flex: 1 }]}>
        <TextInput
          style={[styles.replyInput, { flex: 1, textAlignVertical: 'top' }]}
          placeholder={`Write your letter to ${target.name}…`}
          placeholderTextColor={colors.textMuted}
          multiline
          value={body}
          onChangeText={setBody}
        />
        <WordCount text={body} limit={limit} />
        <Pressable
          onPress={submit}
          disabled={sending || body.trim().length === 0 || overLimit}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.sendBtn,
            webTransition,
            body.trim().length === 0 || overLimit ? { opacity: 0.5 } : null,
            hovered ? { opacity: 0.92 } : null,
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
  );
}

const styles = StyleSheet.create({
  deskRoot: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent', position: 'relative' },
  listColTop: { padding: spacing.lg, paddingBottom: 0, gap: spacing.md },
  listColBottom: { padding: spacing.lg, paddingTop: spacing.md },
  composeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: spacing.md,
    boxShadow: cta.glow,
    ...Platform.select({ web: { backgroundImage: cta.gradientCss } as object }),
  },
  composeText: { ...type.button, color: colors.onPrimary, fontSize: 14 },

  lettersCard: { gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.bgElevated },
  lettersTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lettersTitle: { ...type.button, fontSize: 14, color: colors.textPrimary },
  lettersMeta: { ...type.caption, fontSize: 11 },

  encNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderColor: colors.goldFaint, backgroundColor: colors.goldFaint, borderRadius: radii.md, padding: spacing.md },
  encNoteText: { ...type.caption, color: colors.textSecondary, flex: 1, fontSize: 11 },

  listCol: { width: 300, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: '#FDF7F2' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.bgElevated },
  searchInput: { flex: 1, paddingVertical: spacing.md, color: colors.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14 },
  emptyList: { ...type.bodyMuted, textAlign: 'center', padding: spacing.xl },

  emptyWrap: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { ...type.h2, fontSize: 16 },
  emptyBody: { ...type.bodyMuted, fontSize: 13, textAlign: 'center' },
  emptyBtn: { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  emptyBtnText: { ...type.button, color: colors.onPrimary, fontSize: 13 },

  msgRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: 'transparent' },
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
  readHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  readSender: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  readSenderName: { ...type.body, fontFamily: 'Inter_600SemiBold' },
  encLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  readTo: { ...type.caption, fontSize: 12 },
  readBodyScroll: { flex: 1 },

  composeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.md },
  composeNoteText: { ...type.caption, color: colors.textSecondary, flex: 1, fontSize: 12 },

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

  replyBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.md, backgroundColor: colors.bgElevated },
  replyInput: { minHeight: 44, color: colors.textPrimary, fontFamily: 'Inter_400Regular', fontSize: 14 },
  sendBtn: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  sendText: { ...type.button, color: colors.onPrimary, fontSize: 13 },

  // mobile
  mobRoot: { flex: 1, padding: spacing.lg, gap: spacing.md },
  mobHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mobLettersRow: { },
  composeFab: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(233,30,115,0.35)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { ...type.button, color: colors.primary, fontSize: 15 },

  avatar: { backgroundColor: colors.sidebar, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.sidebarText, fontFamily: 'Inter_700Bold' },
});
