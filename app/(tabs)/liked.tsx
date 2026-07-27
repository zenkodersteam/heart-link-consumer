import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { GridSkeleton } from '../../src/components/Skeleton';
import { Button } from '../../src/components/primitives';
import { art } from '../../src/art';
import type { PublicProfileSummary } from '../../src/lib/api';
import { humanError } from '../../src/lib/errors';
import { PREVIEW_BYPASS_AUTH, PREVIEW_PROFILES } from '../../src/lib/preview';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { colors, radii, spacing, type } from '../../src/theme';

type SortKey = 'recent' | 'name' | 'age';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'age', label: 'Age' },
];

function columnsForWidth(w: number): number {
  if (w >= 1100) return 3;
  if (w >= 700) return 2;
  return 1;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function useReduceMotion() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}

export default function LikedScreen() {
  const factory = useApiClientFactory();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isList = width < 700;
  const cols = columnsForWidth(width);

  const [items, setItems] = useState<PublicProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await factory();
      const res = await client.listSavedProfiles();
      const got = res.items ?? [];
      setItems(PREVIEW_BYPASS_AUTH && got.length === 0 ? PREVIEW_PROFILES : got);
    } catch (e) {
      // In design-review mode show sample saves so the screen is reviewable.
      if (PREVIEW_BYPASS_AUTH) setItems(PREVIEW_PROFILES);
      else setError(humanError(e, "We couldn't load your liked profiles just now."));
    } finally {
      setLoading(false);
    }
  }, [factory]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const urls = items.map((p) => p.primaryPhotoUrl).filter(Boolean) as string[];
    if (urls.length) void Image.prefetch(urls.slice(0, 12), 'memory-disk').catch(() => false);
  }, [items]);

  // Two-step removal so the card can animate out before it leaves the list.
  const beginRemove = useCallback((id: string) => {
    setRemoving((s) => new Set(s).add(id));
  }, []);

  const finishRemove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((p) => p.id !== id));
      setRemoving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      void (async () => {
        try {
          const client = await factory();
          await client.unsaveProfile(id);
        } catch {
          void load(); // reconcile on failure
        }
      })();
    },
    [factory, load],
  );

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === 'name') copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    else if (sort === 'age') copy.sort((a, b) => (a.age ?? 0) - (b.age ?? 0));
    else copy.sort((a, b) => (b.activatedAt ?? '').localeCompare(a.activatedAt ?? ''));
    return copy;
  }, [items, sort]);

  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? 'Most Recent';

  // Close the sort dropdown when the web window is resized (layout shifts make the
  // absolutely-positioned menu point at the wrong place).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onResize = () => setSortOpen(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Subtle one-shot entrance for the results region: fade + rise on mount and
  // whenever the displayed set changes (sort or items). One container-level driver.
  const reduce = useReduceMotion();
  const reveal = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [reduce, reveal, sorted]);

  const resultsStyle = reduce
    ? null
    : {
        opacity: reveal,
        transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={!isList ? styles.headerBar : undefined}>
        <View style={!isList ? styles.titleBlockLeft : undefined}>
          <View style={[styles.headerRow, !isList ? styles.headerRowLeft : null]}>
            <Text style={styles.headingInline}>Liked</Text>
            <Feather name="heart" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.sub, !isList ? styles.subLeft : null]}>Profiles you've liked and want to revisit.</Text>
        </View>

      {!loading && !error && sorted.length > 0 ? (
        <View style={styles.sortRow}>
          <Text style={styles.sortLead}>Sort by:</Text>
          <View>
            <Pressable
              onPress={() => setSortOpen((o) => !o)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.sortBtn,
                hovered ? { borderColor: colors.primary } : null,
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <Text style={styles.sortBtnText}>{sortLabel}</Text>
              <Feather name="chevron-down" size={15} color={colors.textSecondary} />
            </Pressable>
            {sortOpen ? (
              <>
                <Pressable style={styles.sortBackdrop} onPress={() => setSortOpen(false)} />
                <View style={styles.sortMenu}>
                  {SORTS.map((s) => (
                    <Pressable
                      key={s.key}
                      onPress={() => {
                        setSort(s.key);
                        setSortOpen(false);
                      }}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.sortItem,
                        hovered ? { backgroundColor: colors.surfaceMuted } : null,
                        pressed ? { opacity: 0.8 } : null,
                      ]}
                    >
                      <Text style={[styles.sortItemText, s.key === sort ? styles.sortItemActive : null]}>{s.label}</Text>
                      {s.key === sort ? <Feather name="check" size={16} color={colors.primary} /> : null}
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </View>
      ) : null}
      </View>

      <Animated.View style={[styles.results, resultsStyle]}>
      {loading ? (
        <GridSkeleton count={6} columns={cols} />
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.errIcon}>
            <Feather name="wifi-off" size={22} color={colors.gold} />
          </View>
          <Text style={type.h2}>Your liked list is taking a moment</Text>
          <Text style={styles.errBody}>{error}</Text>
          <Button label="Try again" variant="secondary" onPress={load} />
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState
          art={art.emptyLiked}
          title="No one saved yet"
          body="When someone stands out, tap the heart and they'll wait for you here. Real connections take a second look."
          ctaLabel="Browse profiles"
          onPress={() => router.push('/')}
        />
      ) : isList ? (
        <View style={styles.list}>
          {sorted.map((p) => (
            <RemovableItem key={p.id} removing={removing.has(p.id)} onDone={() => finishRemove(p.id)}>
              <ListRow profile={p} onOpen={() => router.push(`/(tabs)/profile?id=${p.id}`)} />
            </RemovableItem>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {sorted.map((p) => (
            <View key={p.id} style={[styles.cardCol, { width: `${100 / cols}%` }]}>
              <RemovableItem removing={removing.has(p.id)} onDone={() => finishRemove(p.id)}>
                <GridCard
                  profile={p}
                  onOpen={() => router.push(`/(tabs)/profile?id=${p.id}`)}
                  onMessage={() =>
                    router.push(`/mailbox?compose=${p.id}&name=${encodeURIComponent(p.displayName)}`)
                  }
                />
              </RemovableItem>
            </View>
          ))}
        </View>
      )}
      </Animated.View>
    </ScrollView>
  );
}

function RemovableItem({ removing, onDone, children }: { removing: boolean; onDone: () => void; children: ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const started = useRef(false);
  useEffect(() => {
    if (removing && !started.current) {
      started.current = true;
      Animated.timing(v, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => onDone());
    }
  }, [removing, onDone, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

function NameRow({ profile }: { profile: PublicProfileSummary }) {
  return (
    <View style={styles.nameRow}>
      <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
      {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
      <Feather name="shield" size={15} color={colors.goldBright} />
    </View>
  );
}

function GridCard({
  profile,
  onOpen,
  onMessage,
}: {
  profile: PublicProfileSummary;
  onOpen: () => void;
  onMessage: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen}>
        <View style={styles.imageWrap}>
          {profile.primaryPhotoUrl ? (
            <Image source={{ uri: profile.primaryPhotoUrl }} style={styles.image} contentFit="cover" transition={80} cachePolicy="memory-disk" priority="normal" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={type.caption}>No photo</Text>
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.cardBody}>
        <NameRow profile={profile} />
        <Text style={styles.facility} numberOfLines={1}>{profile.facility.state ?? ''}</Text>
        <View style={styles.cardActions}>
          <View style={styles.actionFlex}>
            <Button label="View Profile" variant="secondary" style={styles.actionBtn} onPress={onOpen} />
          </View>
          <View style={styles.actionFlex}>
            <Button label="Message" style={styles.actionBtn} onPress={onMessage} />
          </View>
        </View>
      </View>
    </View>
  );
}

function ListRow({
  profile,
  onOpen,
}: {
  profile: PublicProfileSummary;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.row,
        hovered ? { borderColor: colors.borderStrong } : null,
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      {profile.primaryPhotoUrl ? (
        <Image source={{ uri: profile.primaryPhotoUrl }} style={styles.rowThumb} contentFit="cover" transition={80} cachePolicy="memory-disk" priority="normal" />
      ) : (
        <View style={[styles.rowThumb, styles.placeholder]}>
          <Text style={type.caption}>-</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <NameRow profile={profile} />
        <Text style={styles.facility} numberOfLines={1}>{profile.facility.state ?? ''}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The ScrollView must claim the shell's height itself; without it the mobile
  // content pane (flex: 1, overflow hidden) can hand it zero height.
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl },
  // flexGrow (not flex) so the empty / error blocks fill the remaining height
  // while a full grid still measures at its natural height instead of clipping.
  results: { flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  headingInline: { ...type.h1, textAlign: 'center' },
  sub: { ...type.bodyMuted, textAlign: 'center', marginBottom: spacing.lg },
  headerBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg, marginBottom: spacing.lg, zIndex: 20 },
  titleBlockLeft: { flexShrink: 1 },
  headerRowLeft: { justifyContent: 'flex-start' },
  subLeft: { textAlign: 'left', marginBottom: 0 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg, zIndex: 20 },
  sortLead: { ...type.caption },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  sortBtnText: { ...type.button, fontSize: 13, color: colors.textPrimary },
  sortBackdrop: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000 },
  sortMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: spacing.xs,
    minWidth: 180,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    boxShadow: '0 16px 40px rgba(26, 8, 51, 0.22)',
    zIndex: 30,
  },
  sortItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  sortItemText: { ...type.body, fontSize: 14, color: colors.textSecondary },
  sortItemActive: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  center: {
    flexGrow: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  errIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.goldFaint,
  },
  errBody: { ...type.bodyMuted, fontSize: 14, textAlign: 'center', maxWidth: 340 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm },
  cardCol: { padding: spacing.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative', aspectRatio: 1, backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.h2, flexShrink: 1 },
  age: { ...type.body, color: colors.gold, fontFamily: 'Inter_600SemiBold' },
  facility: { ...type.caption },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionFlex: { flex: 1 },
  // Compact paddings so the labels never wrap inside narrow grid columns.
  actionBtn: { paddingHorizontal: spacing.sm, paddingVertical: 11 },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowThumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  rowBody: { flex: 1, gap: 2 },
});
