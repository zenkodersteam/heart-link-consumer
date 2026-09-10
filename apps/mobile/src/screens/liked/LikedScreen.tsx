import { Feather, Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { LikedListSkeleton } from '../../components/Skeleton';
import { Button } from '../../components/primitives';
import { art } from '../../art';
import type { PublicProfileSummary } from '@heartlink/consumer-api';
import { haptics } from '../../lib/haptics';
import { humanError } from '../../lib/errors';
import { PREVIEW_BYPASS_AUTH, PREVIEW_PROFILES } from '../../lib/preview';
import { ProfilePhoto } from '../../components/ProfilePhoto';
import { stateName } from '@heartlink/consumer-api';
import { useApiClientFactory } from '../../lib/use-api-client';
import { useNavigation } from '@react-navigation/native';

import type { RootNavigation } from '../../navigations/types';

import { colors, depth, radii, spacing, themedStyles, type } from '../../theme';

type SortKey = 'recent' | 'name' | 'age';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'age', label: 'Age' },
];

function columnsForWidth(w: number): number {
  if (w >= 1240) return 4;
  if (w >= 940) return 3;
  if (w >= 620) return 2;
  return 1;
}


function useReduceMotion() {
  return useMemo(() => {
    return false;
  }, []);
}

export default function LikedScreen() {
  const navigation = useNavigation<RootNavigation>();
  const factory = useApiClientFactory();
  const { width } = useWindowDimensions();
  const isList = width < 700;
  const cols = columnsForWidth(width);

  const [items, setItems] = useState<PublicProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

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

  /**
   * Pull to refresh.
   *
   * Separate from `load` so the pull does not also flip `loading` - swapping
   * the list someone is holding for a skeleton is the one thing a refresh
   * gesture should never do.
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const client = await factory();
      const res = await client.listSavedProfiles();
      setItems(res.items ?? []);
      setError(null);
    } catch (e) {
      setError(humanError(e, "We couldn't refresh your liked profiles just now."));
    } finally {
      setRefreshing(false);
    }
  }, [factory]);

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
      useNativeDriver: true,
    }).start();
  }, [reduce, reveal, sorted]);

  const resultsStyle = reduce
    ? null
    : {
        opacity: reveal,
        transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      };

  /**
   * The screen's chrome, handed to the list rather than wrapped around it.
   *
   * A virtualized list has to own the scroll for recycling to mean anything,
   * so the title and the sort control ride along as a header instead of
   * sitting in a ScrollView above it.
   */
  const header = (
    <View style={!isList ? styles.headerBar : undefined}>
      <View style={!isList ? styles.titleBlockLeft : undefined}>
        <View style={[styles.headerRow, !isList ? styles.headerRowLeft : null]}>
          <Text style={styles.headingInline} maxFontSizeMultiplier={1.4}>
            Liked or Saved Profiles
          </Text>
          <Ionicons name="heart" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.sub, !isList ? styles.subLeft : null]}>Profiles you've liked or saved for later.</Text>
      </View>

      {!loading && !error && sorted.length > 0 ? (
        <View style={styles.sortRow}>
          <Text style={styles.sortLead}>Sort by:</Text>
          <View>
            <Pressable
              onPress={() => {
                haptics.selection();
                setSortOpen((o) => !o);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sortLabel}`}
              accessibilityHint="Changes the order of your saved profiles"
              hitSlop={8}
              style={({ pressed }: { pressed: boolean }) => [
                styles.sortBtn,
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
                        haptics.selection();
                        setSort(s.key);
                        setSortOpen(false);
                      }}
                      accessibilityRole="menuitem"
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.sortItem,
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
  );

  const empty = loading ? (
    <LikedListSkeleton count={4} />
  ) : error ? (
    <View style={styles.center}>
      <View style={styles.errIcon}>
        <Feather name="wifi-off" size={22} color={colors.gold} />
      </View>
      <Text style={type.h2}>Your liked list is taking a moment</Text>
      <Text style={styles.errBody}>{error}</Text>
      <Button label="Try again" variant="secondary" onPress={load} />
    </View>
  ) : (
    <EmptyState
      art={art.emptyLiked}
      title="No one saved yet"
      body="When someone stands out, tap the heart and they'll wait for you here. Real connections take a second look."
      ctaLabel="Browse profiles"
      onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
    />
  );

  return (
    <Animated.View style={[styles.scrollView, resultsStyle]}>
      <FlashList
        data={loading || error ? [] : sorted}
        keyExtractor={(p) => p.id}
        // Recycling is the whole point: without a stable estimate FlashList
        // cannot size its window, and the rows here are two fixed shapes.
        estimatedItemSize={isList ? 108 : 260}
        // FlashList's content container takes padding only - flex values on it
        // are ignored and warn, because the list sizes its own window.
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item: p }) => (
          // The gap that used to come from the container's `gap`: a virtualized
          // list has no container to space its children, so each row carries it.
          <View style={isList ? styles.rowSpacing : styles.cardSpacing}>
          <RemovableItem removing={removing.has(p.id)} onDone={() => finishRemove(p.id)}>
            {isList ? (
              <ListRow
                profile={p}
                onOpen={() => navigation.navigate('Profile', { id: p.id })}
                onUnlike={() => beginRemove(p.id)}
              />
            ) : (
              <WideCard
                profile={p}
                onOpen={() => navigation.navigate('Profile', { id: p.id })}
                onMessage={() =>
                  navigation.navigate('Tabs', { screen: 'Mailbox', params: { compose: p.id, name: p.displayName } })
                }
                onUnlike={() => beginRemove(p.id)}
              />
            )}
          </RemovableItem>
          </View>
        )}
      />
    </Animated.View>
  );
}

function RemovableItem({ removing, onDone, children }: { removing: boolean; onDone: () => void; children: ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  const started = useRef(false);
  useEffect(() => {
    if (removing && !started.current) {
      started.current = true;
      // Opacity and scale only, so this runs on the UI thread: the removal is
      // followed immediately by a network call and a list update, which is
      // exactly the work that used to make it stutter.
      Animated.timing(v, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
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
      <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.4}>{profile.displayName}</Text>
      {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
      {/* Same rule as the browse cards and the profile page: only shown when
          staff recorded an identity check. */}
      {profile.isVerified ? (
        <Feather name="shield" size={15} color={colors.goldBright} />
      ) : null}
    </View>
  );
}

/**
 * Wide card for web / tablet.
 *
 * The grid this replaced put a portrait photo in a narrow column, so the image
 * grew taller as the column grew wider and the two actions had no room to sit
 * side by side. Laying the card out horizontally fixes both: the photo's height
 * is set by the row, not by the column width, and the body gets the space it
 * needs for a bio excerpt and full-width buttons.
 */
function WideCard({
  profile,
  onOpen,
  onMessage,
  onUnlike,
}: {
  profile: PublicProfileSummary;
  onOpen: () => void;
  onMessage: () => void;
  onUnlike: () => void;
}) {
  // Only `state` exists on the summary; expand it so the card reads
  // "Texas" rather than "TX".
  const place = profile.facility.state ? stateName(profile.facility.state) : '';
  return (
    <View
      style={styles.wideCard}
    >
      <Pressable onPress={onOpen} style={styles.widePhotoPress}>
        <View style={styles.widePhoto}>
          <ProfilePhoto uri={profile.primaryPhotoUrl} name={profile.displayName} style={styles.image} priority="normal" />
          {profile.photoCount > 1 ? (
            <View style={styles.photoCount}>
              <Feather name="image" size={11} color={colors.sidebarText} />
              <Text style={styles.photoCountText}>{profile.photoCount}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.wideBody}>
        <View style={styles.wideTop}>
          <Pressable onPress={onOpen}>
            hitSlop={8}
            <NameRow profile={profile} />
          </Pressable>
          {place ? (
            <View style={styles.wherePill}>
              <Feather name="map-pin" size={12} color={colors.textMuted} />
              <Text style={styles.facility} numberOfLines={1} maxFontSizeMultiplier={1.4}>{place}</Text>
            </View>
          ) : null}
          {profile.bioExcerpt ? (
            <Text style={styles.wideBio} numberOfLines={2}>{profile.bioExcerpt}</Text>
          ) : null}
        </View>

        <View style={styles.wideActions}>
          <Button label="View profile" variant="secondary" onPress={onOpen} />
          <Button label="Write a letter" onPress={onMessage} />
        </View>
      </View>

      <Pressable
        onPress={onUnlike}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${profile.displayName} from your liked profiles`}
        style={({ pressed }: { pressed: boolean }) => [
          styles.cardHeartBtn,
          pressed ? { transform: [{ scale: 0.88 }] } : null,
        ]}
      >
        <Ionicons name="heart" size={20} color={colors.primary} />
      </Pressable>
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
    <View
      style={styles.card}
    >
      <Pressable onPress={onOpen}>
        <View style={styles.imageWrap}>
          <ProfilePhoto uri={profile.primaryPhotoUrl} name={profile.displayName} style={styles.image} priority="normal" />
        </View>
      </Pressable>
      <View style={styles.cardBody}>
        <NameRow profile={profile} />
        <Text style={styles.facility} numberOfLines={1} maxFontSizeMultiplier={1.4}>{profile.facility.state ?? ''}</Text>
        <View style={styles.cardActions}>
          <View style={styles.actionFlex}>
            <Button label="View" variant="secondary" style={styles.actionBtn} onPress={onOpen} />
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
  onUnlike,
}: {
  profile: PublicProfileSummary;
  onOpen: () => void;
  onUnlike: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }: { pressed: boolean }) => [
        styles.row,
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={[styles.rowThumb, { overflow: 'hidden' }]}>
        <ProfilePhoto uri={profile.primaryPhotoUrl} name={profile.displayName} priority="normal" compact />
      </View>
      <View style={styles.rowBody}>
        <NameRow profile={profile} />
        <Text style={styles.facility} numberOfLines={1} maxFontSizeMultiplier={1.4}>{profile.facility.state ?? ''}</Text>
      </View>
      {/* Filled, not an outline: everyone on this screen is already liked, and
          an empty heart on a list of likes reads as "not liked". Tapping it
          takes them off the list. */}
      <Pressable
        onPress={onUnlike}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${profile.displayName} from your liked profiles`}
        style={({ pressed }: { pressed: boolean }) => [
          styles.heartBtn,
          pressed ? { transform: [{ scale: 0.88 }] } : null,
        ]}
      >
        <Ionicons name="heart" size={20} color={colors.primary} />
      </Pressable>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  // The ScrollView must claim the shell's height itself; without it the mobile
  // content pane (flex: 1, overflow hidden) can hand it zero height.
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl },
  listContent: { padding: spacing.xl },
  // flexGrow (not flex) so the empty / error blocks fill the remaining height
  // while a full grid still measures at its natural height instead of clipping.
  results: { flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  // flexShrink so the longer title wraps rather than clipping at the screen
  // edge, and sized to sit on one line at phone widths as the client sets it.
  headingInline: { ...type.h1, fontSize: 22, lineHeight: 28, textAlign: 'center', flexShrink: 1 },
  heartBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
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

  // --- wide (web/tablet) card ---
  cardSpacing: { marginBottom: spacing.lg },
  wideCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...depth.resting,
  },
  widePhotoPress: { alignSelf: 'stretch' },
  // Fixed width + stretched height: the photo can no longer grow with the
  // container, which is what made the old grid image so tall.
  widePhoto: { width: 190, height: '100%', minHeight: 208, position: 'relative', backgroundColor: colors.surfaceMuted },
  photoCount: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(22, 5, 31, 0.62)',
  },
  photoCountText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.sidebarText },
  wideBody: { flex: 1, padding: spacing.xl, justifyContent: 'space-between', gap: spacing.lg },
  // Room on the right for the unlike control, which is pinned to the corner.
  wideTop: { paddingRight: 40, gap: spacing.sm },
  wherePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  wideBio: { ...type.bodyMuted, fontSize: 14 },
  wideActions: { flexDirection: 'row', gap: spacing.md },

  cardCol: { padding: spacing.sm },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...depth.resting,
  },
  imageWrap: {
    position: 'relative',
    // 4:5 matches the browse deck's photo framing — the grid was the odd one
    // out at 1:1. The cap stops a wide column from turning that into a 500px
    // slab; the photo just crops tighter instead.
    aspectRatio: 4 / 5,
    maxHeight: 300,
    backgroundColor: colors.surfaceMuted,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.lg, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.h2, flexShrink: 1 },
  age: { ...type.body, color: colors.gold, fontFamily: 'Inter_600SemiBold' },
  facility: { ...type.caption },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionFlex: { flex: 1 },
  // Compact paddings so the labels never wrap inside narrow grid columns.
  actionBtn: { paddingHorizontal: spacing.sm, paddingVertical: 11 },
  rowSpacing: { marginBottom: spacing.md },
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
}));
