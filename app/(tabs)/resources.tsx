import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { art } from '../../src/art';
import { Button } from '../../src/components/primitives';
import type { ListResourcesResponse, ResourceItem } from '../../src/lib/api';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { colors, fonts, radii, spacing, type } from '../../src/theme';
import { ListSkeleton } from '../../src/components/Skeleton';

/**
 * Resources (UI lift, Navan help-center pattern): serif hero + pill search,
 * category chips, four art-tile cards, midnight support band. Drilling into a
 * category (or searching) opens the level-2 view: breadcrumb, tile art as a
 * hero band, search-within-category, live org cards from /api/resources.
 *
 * Backend gap (handoff): ResourceItem has no location/state field yet, so the
 * "California + National" location filter chip ships with the state param.
 */

const webTransition =
  Platform.OS === 'web'
    ? { transitionProperty: 'background-color, border-color, transform, box-shadow', transitionDuration: '160ms', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }
    : null;

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function useReduceMotion() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}

type CatKey = 'awareness' | 'reentry' | 'mental' | 'community';

interface Category {
  key: CatKey;
  title: string;
  blurb: string;
  tags: string[];
  art: number;
}

const CATEGORIES: Category[] = [
  {
    key: 'awareness',
    title: 'Prison Awareness',
    blurb: 'Understand the system your person is living inside: education, advocacy, and the organizations doing the work.',
    tags: ['Education', 'Advocacy', 'Awareness'],
    art: art.resAwareness,
  },
  {
    key: 'reentry',
    title: 'Reentry Support',
    blurb: 'Resources for successful reintegration: housing, employment, and life skills.',
    tags: ['Employment', 'Housing', 'Life Skills'],
    art: art.resReentry,
  },
  {
    key: 'mental',
    title: 'Mental Health Support',
    blurb: 'Mental health resources, crisis support, and wellness tools for healing and growth.',
    tags: ['Counseling', 'Wellness', 'Crisis Support'],
    art: art.resMental,
  },
  {
    key: 'community',
    title: 'Community Support Groups',
    blurb: 'Connect with local and online groups that offer understanding and support.',
    tags: ['Peer Support', 'Groups', 'Mentorship'],
    art: art.resCommunity,
  },
];

interface FetchState {
  data: ListResourcesResponse | null;
  loading: boolean;
  error: string | null;
}

export default function ResourcesScreen() {
  const router = useRouter();
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
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'Could not load resources.' });
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
    Animated.timing(gridReveal, { toValue: 1, duration: 300, useNativeDriver: USE_NATIVE_DRIVER }).start();
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => { setActive('all'); setSearch(''); }} style={styles.crumb}>
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
          placeholder={`Search within ${activeCategory.title}...`}
        />

        <Animated.View style={[styles.orgList, gridStyle]}>
          {state.loading ? (
            <View style={{ width: '100%' }}>
              <ListSkeleton count={4} />
            </View>
          ) : state.error ? (
            <Text style={styles.empty}>{state.error}</Text>
          ) : items.length === 0 ? (
            <Text style={styles.empty}>No resources match{q ? ` "${q}"` : ''}.</Text>
          ) : (
            items.map((it) => <OrgCard key={it.id} item={it} />)
          )}
        </Animated.View>
      </ScrollView>
    );
  }

  // ---- Level 1: landing ----
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Resources &amp; Support</Text>
          <Feather name="heart" size={20} color={colors.primary} />
        </View>
        <Text style={styles.sub}>Information, guidance, and support for every step of the journey.</Text>
        <SearchPill
          value={search}
          onChange={setSearch}
          placeholder="Search resources, topics, or organizations..."
        />
      </View>

      <View style={styles.rchips}>
        <RChip label="All Resources" active onPress={() => setActive('all')} />
        {CATEGORIES.map((c) => (
          <RChip key={c.key} label={c.title} onPress={() => setActive(c.key)} />
        ))}
      </View>

      {q.length > 0 ? (
        <Animated.View style={[styles.orgList, gridStyle]}>
          {state.loading ? (
            <View style={{ width: '100%' }}>
              <ListSkeleton count={4} />
            </View>
          ) : state.error ? (
            <Text style={styles.empty}>{state.error}</Text>
          ) : items.length === 0 ? (
            <Text style={styles.empty}>No resources match "{q}".</Text>
          ) : (
            items.map((it) => <OrgCard key={it.id} item={it} />)
          )}
        </Animated.View>
      ) : (
        <Animated.View style={[styles.grid, gridStyle]}>
          {CATEGORIES.map((c) => (
            <View key={c.key} style={[styles.col, { width: `${100 / cols}%` }]}>
              <NCard category={c} onPress={() => setActive(c.key)} />
            </View>
          ))}
        </Animated.View>
      )}

      <View style={styles.supportBand}>
        <View style={styles.supportCopy}>
          <Text style={styles.supportTitle}>Need personalized support?</Text>
          <Text style={styles.supportBody}>
            Our support team is here to help you find the right resources for your unique situation.
          </Text>
        </View>
        <Button label="Contact Support" onPress={() => router.push('/support')} />
      </View>
    </ScrollView>
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
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <View style={styles.searchGo}>
        <Feather name="search" size={17} color={colors.onPrimary} />
      </View>
    </View>
  );
}

function RChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.rchip,
        webTransition,
        active ? styles.rchipActive : null,
        hovered && !active ? { borderColor: colors.primary } : null,
        pressed ? { transform: [{ scale: 0.96 }] } : null,
      ]}
    >
      <Text style={[styles.rchipText, active ? styles.rchipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

/** Image-block category card with a white caption bar (Navan/Patreon tile). */
function NCard({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.ncard,
        webTransition,
        hovered ? styles.ncardHover : null,
        pressed ? { transform: [{ scale: 0.995 }] } : null,
      ]}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <>
          <View style={styles.ncardArt}>
            {/* Micro-interaction: tile art zooms, arrow slides on hover. */}
            <Image
              source={category.art}
              style={[styles.ncardArtImg, hovered ? styles.ncardArtImgHover : null]}
              contentFit="cover"
            />
          </View>
          <View style={styles.ncardCap}>
            <View style={styles.ncardTitleRow}>
              <Text style={styles.ncardTitle}>{category.title}</Text>
              <Feather
                name="arrow-right"
                size={16}
                color={colors.primary}
                style={[styles.ncardArr, hovered ? styles.ncardArrHover : null]}
              />
            </View>
            <View style={styles.tags}>
              {category.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
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
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.org,
        webTransition,
        hasLink && hovered ? styles.orgHover : null,
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

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl },

  hero: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  heading: { ...type.h1, fontSize: 30, textAlign: 'center' },
  sub: { ...type.bodyMuted, textAlign: 'center', marginTop: 6, marginBottom: spacing.lg },

  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingLeft: 22,
    paddingRight: 8,
    paddingVertical: 8,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    boxShadow: '0 10px 30px rgba(46,18,64,0.10)',
  },
  searchInput: { flex: 1, paddingVertical: 4, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14.5 },
  searchGo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    boxShadow: '0 6px 14px rgba(233,30,115,0.35)',
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(135deg, #FF4F92, #E91E73)' } as object,
    }),
  },

  rchips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.lg },
  rchip: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rchipActive: {
    backgroundColor: colors.primary,
    borderColor: 'transparent',
    boxShadow: '0 8px 20px rgba(233,30,115,0.35)',
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(135deg, #FF4F92, #E91E73)' } as object,
    }),
  },
  rchipText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textSecondary },
  rchipTextActive: { color: colors.onPrimary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm },
  col: { padding: spacing.sm },
  ncard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 22,
    overflow: 'hidden',
    boxShadow:
      '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06), 0 24px 48px rgba(46,18,64,0.10)',
  },
  ncardHover: {
    transform: [{ translateY: -4 }],
    boxShadow:
      '0 2px 4px rgba(46,18,64,0.06), 0 14px 28px rgba(46,18,64,0.10), 0 34px 64px rgba(46,18,64,0.14)',
  },
  ncardArt: { height: 130, overflow: 'hidden', backgroundColor: colors.midnight },
  ncardArtImg: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: { transitionProperty: 'transform', transitionDuration: '350ms' } as object,
    }),
  },
  ncardArtImgHover: { transform: [{ scale: 1.05 }] },
  ncardArr: {
    ...Platform.select({
      web: { transitionProperty: 'transform', transitionDuration: '160ms' } as object,
    }),
  },
  ncardArrHover: { transform: [{ translateX: 4 }] },
  ncardCap: { paddingVertical: 16, paddingHorizontal: 18, gap: 9 },
  ncardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  ncardTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.textPrimary, flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.textSecondary },

  // Midnight support band
  supportBand: {
    marginTop: 18,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,168,79,0.4)',
    backgroundColor: colors.sidebar,
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(300px 160px at 92% 10%, rgba(233,30,115,0.35), transparent 60%), linear-gradient(150deg, #1B0826, #2E1240 60%, #3A1550)',
      } as object,
    }),
  },
  supportCopy: { flex: 1, minWidth: 220, gap: 3 },
  supportTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.sidebarText },
  supportBody: { fontFamily: fonts.body, fontSize: 13.5, color: colors.sidebarTextMuted },

  // Level 2
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
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage:
          'linear-gradient(90deg, rgba(22,5,31,0.85) 30%, rgba(22,5,31,0.25) 60%, rgba(22,5,31,0) 85%)',
      } as object,
    }),
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
  orgHover: {
    transform: [{ translateY: -2 }],
    boxShadow:
      '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06), 0 24px 48px rgba(46,18,64,0.10)',
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
});
