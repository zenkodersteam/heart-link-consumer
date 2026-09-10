import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { art } from '../../art';
import { Button } from '../../components/primitives';
import type { ListResourcesResponse, ResourceItem } from '@heartlink/consumer-api';
import { useApiClientFactory } from '../../lib/use-api-client';
import { useNavigation } from '@react-navigation/native';

import type { RootNavigation } from '../../navigations/types';

import { colors, fonts, radii, spacing, themedStyles, type } from '../../theme';
import { ErrorState } from '../../components/ErrorState';
import { ListSkeleton } from '../../components/Skeleton';
import { FlashList } from '@shopify/flash-list';

import { KeyboardSafeScrollView } from '../../components/KeyboardSafeScrollView';

/**
 * Resources (UI lift, Navan help-center pattern): serif hero + pill search,
 * category chips, four art-tile cards, midnight support band. Drilling into a
 * category (or searching) opens the level-2 view: breadcrumb, tile art as a
 * hero band, search-within-category, live org cards from /api/resources.
 *
 * Backend gap (handoff): ResourceItem has no location/state field yet, so the
 * "California + National" location filter chip ships with the state param.
 */


function useReduceMotion() {
  return useMemo(() => {
    return false;
  }, []);
}

type CatKey = 'awareness' | 'reentry' | 'mental' | 'community';

interface Category {
  key: CatKey;
  title: string;
  blurb: string;
  /** Short line for the row on the landing screen; `blurb` is the long one. */
  summary: string;
  tags: string[];
  /** Round pastel tile on the landing rows. */
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  ink: string;
  art: number;
}

const CATEGORIES: Category[] = [
  {
    key: 'awareness',
    title: 'Prison Awareness',
    blurb: 'Understand the system your person is living inside: education, advocacy, and the organizations doing the work.',
    summary: 'Learn about the justice system and make a difference.',
    tags: ['Education', 'Advocacy', 'Awareness'],
    icon: 'book-open',
    tint: 'rgba(126, 87, 194, 0.14)',
    ink: '#5E35B1',
    art: art.resAwareness,
  },
  {
    key: 'reentry',
    title: 'Reentry Support',
    blurb: 'Resources for successful reintegration: housing, employment, and life skills.',
    summary: 'Resources for housing, employment, and life skills.',
    tags: ['Employment', 'Housing', 'Life Skills'],
    icon: 'sun',
    tint: 'rgba(230, 145, 56, 0.16)',
    ink: '#C77800',
    art: art.resReentry,
  },
  {
    key: 'mental',
    title: 'Mental Health Support',
    blurb: 'Mental health resources, crisis support, and wellness tools for healing and growth.',
    summary: 'Find mental health resources and wellness support.',
    tags: ['Counseling', 'Wellness', 'Crisis Support'],
    icon: 'heart',
    tint: 'rgba(149, 117, 205, 0.16)',
    ink: '#6A4BA6',
    art: art.resMental,
  },
  {
    key: 'community',
    title: 'Community Support Groups',
    blurb: 'Connect with local and online groups that offer understanding and support.',
    summary: 'Connect with groups that offer understanding.',
    tags: ['Peer Support', 'Groups', 'Mentorship'],
    icon: 'users',
    tint: 'rgba(219, 2, 82, 0.10)',
    ink: '#DB0252',
    art: art.resCommunity,
  },
];

interface FetchState {
  data: ListResourcesResponse | null;
  loading: boolean;
  /** The caught value itself, so ErrorState can tell offline from a real fault. */
  error: unknown;
}

export default function ResourcesScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { width } = useWindowDimensions();
  const cols = width >= 800 ? 2 : 1;

  const [active, setActive] = useState<CatKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const reduce = useReduceMotion();

  const factory = useApiClientFactory();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const [state, setState] = useState<FetchState>({ data: null, loading: false, error: null });

  // Debounced: firing on every keystroke cancelled the request in flight and
  // the list sat in a loading state while someone was still typing.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const q = debounced;
  const showCards = active === 'all' && q.length === 0;
  const activeCategory = CATEGORIES.find((c) => c.key === active) ?? null;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const client = await factoryRef.current();
        const data = await client.listResources({
          categorySlug: active === 'all' ? undefined : active,
          q: q || undefined,
        });
        if (signal?.aborted) return;
        setState({ data, loading: false, error: null });
      } catch (e) {
        if (signal?.aborted) return;
        setState({ data: null, loading: false, error: e });
      }
    },
    [active, q],
  );

  useEffect(() => {
    if (showCards) return;
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [showCards, load]);

  const gridReveal = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    gridReveal.setValue(0);
    Animated.timing(gridReveal, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [active, q, reduce, gridReveal]);
  const gridStyle = reduce
    ? null
    : {
        opacity: gridReveal,
        transform: [{ translateY: gridReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      };

  const items = state.data?.items ?? [];

  // ---- Level 2: category detail ----
  if (activeCategory) {
    return (
      <OrgList
        items={items}
        state={state}
        q={q}
        onRetry={() => void load()}
        onRefresh={load}
        header={
          <>
            <Pressable
              onPress={() => { setActive('all'); setSearch(''); }}
              style={styles.crumb}
              accessibilityRole="button"
              accessibilityLabel="Back to all resources"
              hitSlop={8}
            >
              <Text style={styles.crumbText}>
                All Resources <Text style={styles.crumbSep}>›</Text>{' '}
                <Text style={styles.crumbActive}>{activeCategory.title}</Text>
              </Text>
            </Pressable>

            <View style={styles.cathero}>
              <Image source={activeCategory.art} style={styles.catheroArt} contentFit="cover" />
              <View style={styles.catheroVeil} />
              <View style={styles.catheroTxt}>
                <Text style={styles.catheroTitle}>{activeCategory.title}</Text>
                <Text style={styles.catheroBlurb}>{activeCategory.blurb}</Text>
              </View>
            </View>

            <SearchPill
              value={search}
              onChange={setSearch}
              placeholder={`Search ${activeCategory.title}`}
            />
          </>
        }
      />
    );
  }

  // ---- Level 1: landing ----
  return (
    <KeyboardSafeScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Resources &amp; Support</Text>
          <Feather name="heart" size={20} color={colors.primary} />
        </View>
        <Text style={styles.sub}>Information, guidance, and support for every step of the journey.</Text>
        <SearchPill
          value={search}
          onChange={setSearch}
          placeholder="Search resources and organizations"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rchipScroll}
        contentContainerStyle={styles.rchips}
      >
        <RChip label="All" active onPress={() => setActive('all')} />
        {CATEGORIES.map((c) => (
          <RChip key={c.key} label={c.title} onPress={() => setActive(c.key)} />
        ))}
      </ScrollView>

      {q.length > 0 ? (
        // Search results are as long as the directory is; the category grid
        // below is four fixed cards and stays plain views.
        <View style={styles.searchResults}>
          <OrgList items={items} state={state} q={q} onRetry={() => void load()} onRefresh={load} embedded />
        </View>
      ) : (
        <Animated.View style={[styles.grid, gridStyle]}>
          {/* One per row on a phone; wider screens still take two, which is
              what `cols` is for. */}
          {CATEGORIES.map((c) => (
            <View key={c.key} style={cols > 1 ? { width: `${100 / cols}%` } : undefined}>
              <NCard category={c} onPress={() => setActive(c.key)} />
            </View>
          ))}
        </Animated.View>
      )}

      {/* Light card with the headset mark, as the phone screens draw it. It
          was a deep purple band, which on this warm page read as a different
          product rather than the last card in the list. */}
      <View style={styles.supportBand}>
        <View style={styles.supportTop}>
          <View style={styles.supportIcon}>
            <Feather name="headphones" size={20} color={colors.primary} />
          </View>
          <View style={styles.supportCopy}>
            <Text style={styles.supportTitle}>Need help finding resources?</Text>
            <Text style={styles.supportBody}>Our support team is here for you.</Text>
          </View>
        </View>
        <Button label="Contact Support" onPress={() => navigation.navigate('Support')} />
      </View>
    </KeyboardSafeScrollView>
  );
}

/**
 * The organisation list, virtualized.
 *
 * One component for both places it appears - a category's contents and a search
 * across everything - because they are the same list with a different header,
 * and because a directory has no ceiling on its length. `estimatedItemSize` is
 * measured from OrgCard at its most common height (title, blurb, two tags).
 */
function OrgList({
  items,
  state,
  q,
  header,
  onRetry,
  onRefresh,
  embedded,
}: {
  items: ResourceItem[];
  state: { loading: boolean; error: unknown };
  q: string;
  header?: ReactNode;
  onRetry: () => void;
  onRefresh: () => Promise<void> | void;
  embedded?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <FlashList
      data={state.loading || state.error ? [] : items}
      keyExtractor={(it) => it.id}
      estimatedItemSize={148}
      contentContainerStyle={embedded ? styles.listContentEmbedded : styles.listContent}
      showsVerticalScrollIndicator={false}
      // Embedded inside the landing page's own scroll view, this list must not
      // scroll on its own - the page does. It still recycles.
      scrollEnabled={!embedded}
      nestedScrollEnabled={embedded}
      ListHeaderComponent={header ? <>{header}</> : null}
      refreshControl={
        embedded ? undefined : (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        )
      }
      ListEmptyComponent={
        state.loading ? (
          <ListSkeleton count={4} />
        ) : state.error ? (
          <ErrorState error={state.error} fallback="We could not load these resources." onRetry={onRetry} compact />
        ) : (
          <Text style={styles.empty}>No resources match{q ? ` "${q}"` : ''}.</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.orgSpacing}>
          <OrgCard item={item} />
        </View>
      )}
    />
  );
}

function SearchPill({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchPill}>
      {/* Leading glyph rather than a trailing button. The trailing pink circle
          sat on top of the placeholder and, once there was text, crowded the
          clear button beside it. A search field does not need a button: typing
          already searches. */}
      <Feather name="search" size={17} color={colors.textMuted} />
      <TextInput
        style={[styles.searchInput]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.searchClear}
        >
          <Feather name="x" size={13} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function RChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.rchip,
        active ? styles.rchipActive : null,
        pressed ? { transform: [{ scale: 0.96 }] } : null,
      ]}
    >
      <Text style={[styles.rchipText, active ? styles.rchipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

/**
 * A category on the landing screen: round icon tile, title, one line of what it
 * is, its tags, and a chevron — the compact row the client screens draw.
 *
 * It used to be a full-bleed art block per category. Four of those is four
 * screens of scrolling before you have seen what is on offer, and the art told
 * you nothing the title did not. The art is still used, as the hero on the
 * category screen you land on.
 */
function NCard({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.ncard,
        pressed ? { transform: [{ scale: 0.995 }] } : null,
      ]}
    >
      <View style={[styles.ncardIcon, { backgroundColor: category.tint }]}>
        <Feather name={category.icon} size={22} color={category.ink} />
      </View>

      <View style={styles.ncardBody}>
        <Text style={styles.ncardTitle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {category.title}
        </Text>
        <Text style={styles.ncardSummary} numberOfLines={2}>
          {category.summary}
        </Text>
        <View style={styles.ncardTags}>
          {category.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.ncardTag}>
              <Text style={styles.ncardTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

/** Live directory entry as an org card: disc, name + external-link, purpose, tags. */
function OrgCard({ item }: { item: ResourceItem }) {
  const hasLink = !!item.url || !!item.phone;
  const open = () => {
    if (item.url) void Linking.openURL(item.url);
    else if (item.phone) void Linking.openURL(`tel:${item.phone.replace(/[^0-9+]/g, '')}`);
  };
  return (
    <Pressable
      onPress={hasLink ? open : undefined}
      style={({ pressed }: { pressed: boolean }) => [
        styles.org,
        hasLink && pressed ? { transform: [{ scale: 0.995 }] } : null,
      ]}
    >
      <View style={styles.orgDisc}>
        <Feather name="book-open" size={18} color={colors.gold} />
      </View>
      <View style={styles.orgBody}>
        <View style={styles.orgTitleRow}>
          <Text style={styles.orgTitle}>{item.title}</Text>
          {hasLink ? (
            <Feather name={item.url ? 'external-link' : 'phone'} size={13} color={colors.textMuted} />
          ) : null}
        </View>
        {item.organization ? <Text style={styles.orgOrg}>{item.organization}</Text> : null}
        {item.description ? <Text style={styles.orgDesc}>{item.description}</Text> : null}
        {item.tags.length ? (
          <View style={styles.tags}>
            {item.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {item.phone ? <Text style={styles.orgPhone}>{item.phone}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  listContent: { padding: spacing.xl },
  listContentEmbedded: { paddingTop: spacing.md },
  orgSpacing: { marginBottom: spacing.md },
  searchResults: { minHeight: 320 },
  scroll: { flexGrow: 1, padding: spacing.xl },

  hero: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  heading: { ...type.h1, fontSize: 24, lineHeight: 30, textAlign: 'center', flexShrink: 1 },
  sub: { ...type.bodyMuted, textAlign: 'center', marginTop: 6, marginBottom: spacing.lg },

  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    boxShadow: '0 10px 30px rgba(46,18,64,0.10)',
  },
  searchInput: { flex: 1, paddingVertical: 0, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14.5 },
  searchClear: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },

  rchipScroll: { flexGrow: 0, marginHorizontal: -spacing.lg },
  rchips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rchip: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  rchipActive: {
    backgroundColor: colors.primary,
    borderColor: 'transparent',
    boxShadow: '0 8px 20px rgba(219, 2, 82,0.35)',
  },
  rchipText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textSecondary },
  rchipTextActive: { color: colors.onPrimary },

  grid: { gap: spacing.md },
  ncard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 18,
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06)',
  },
  ncardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ncardBody: { flex: 1, gap: 3 },
  ncardTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary },
  ncardSummary: { ...type.caption, color: colors.textSecondary, lineHeight: 17 },
  ncardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  ncardTag: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  ncardTagText: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.textSecondary },

  // Midnight support band
  supportBand: {
    marginTop: spacing.lg,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    backgroundColor: colors.bgCard,
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06)',
  },
  supportTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  supportIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
  },
  supportCopy: { flex: 1, gap: 2 },
  supportTitle: { fontFamily: fonts.heading, fontSize: 15.5, color: colors.textPrimary },
  supportBody: { ...type.caption, color: colors.textSecondary },
  crumb: { alignSelf: 'flex-start', marginBottom: 16 },
  crumbText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textMuted },
  crumbSep: { color: colors.textMuted },
  crumbActive: { color: colors.primary },
  cathero: {
    height: 170,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 22,
    justifyContent: 'flex-end',
    backgroundColor: colors.midnight,
  },
  catheroArt: { ...StyleSheet.absoluteFillObject },
  catheroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,5,31,0.45)',
  },
  catheroTxt: { padding: 22, paddingHorizontal: 26 },
  catheroTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.sidebarText },
  catheroBlurb: { fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(251,245,232,0.85)', marginTop: 4, maxWidth: 520 },

  orgList: { gap: 14, marginTop: 14, width: '100%' },
  org: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 22,
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 6px 16px rgba(46,18,64,0.06)',
  },
  orgDisc: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldFaint,
  },
  orgBody: { flex: 1, gap: 4 },
  orgTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orgTitle: { fontFamily: fonts.heading, fontSize: 15.5, color: colors.textPrimary, flexShrink: 1 },
  orgOrg: { ...type.caption, color: colors.gold, fontSize: 12 },
  orgDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  orgPhone: { ...type.button, fontSize: 13, color: colors.primary },

  empty: { ...type.bodyMuted, textAlign: 'center', paddingVertical: spacing.xl },
}));
