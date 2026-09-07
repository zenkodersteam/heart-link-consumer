import { useSession } from '../../src/lib/session';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandDecor } from '../../src/components/BrandDecor';
import { FilterSheet } from '../../src/components/FilterSheet';
import { GenderMenu, type AnchorRect } from '../../src/components/GenderMenu';
import { ProfileDeck, type SwipeDir } from '../../src/components/ProfileDeck';
import { ErrorState } from '../../src/components/ErrorState';
import { DeckSkeleton } from '../../src/components/Skeleton';
import { StoryPanel } from '../../src/components/StoryPanel';
import { useToast } from '../../src/components/Toast';
import { Button } from '../../src/components/primitives';
import type { ListPublicProfilesQuery, ProfileGender, PublicProfileSummary, SwipeAction } from '@heartlink/consumer-api';
import { PREVIEW_BYPASS_AUTH, PREVIEW_PROFILES } from '../../src/lib/preview';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { usePublicProfiles } from '../../src/lib/use-public-profiles';
import { colors, radii, spacing, type } from '../../src/theme';

const PAGE_SIZE = 20;

const GENDER_LABEL: Record<string, string> = { male: 'Men', female: 'Women' };

function formatAgeValue(ageMin?: number, ageMax?: number) {
  if (!ageMin && !ageMax) return 'All';
  return `${ageMin ?? 18}-${ageMax ?? 99}`;
}

export default function HomeScreen() {
  const factory = useApiClientFactory();
  const toast = useToast();
  const router = useRouter();
  const { user } = useSession();
  const email = user?.email ?? '';
  const avatarInitial = email ? email[0].toUpperCase() : null;
  const [query, setQuery] = useState<ListPublicProfilesQuery>({ limit: PAGE_SIZE, offset: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const { data, loading, error, refresh, hasMore, loadMore } = usePublicProfiles(query);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const [genderMenuOpen, setGenderMenuOpen] = useState(false);
  const [genderAnchor, setGenderAnchor] = useState<AnchorRect | null>(null);
  const [frontProfile, setFrontProfile] = useState<PublicProfileSummary | null>(null);
  const [swipedCount, setSwipedCount] = useState(0);

  // Saved state started empty on every launch, so profiles someone had already
  // liked came back showing an empty heart and looked lost. Hydrate from the
  // server before the deck is touched.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const client = await factory();
        const res = await client.listSavedProfiles();
        if (active) setSaved(new Set(res.items.map((i) => i.id)));
      } catch {
        // Leave the hearts empty rather than guessing; the next save will sync.
      }
    })();
    return () => {
      active = false;
    };
  }, [factory]);
  const genderChipRef = useRef<View>(null);

  const openGenderMenu = useCallback(() => {
    // Open immediately; refine the anchor position once measured (desktop only).
    setGenderMenuOpen(true);
    const node = genderChipRef.current;
    if (node && isDesktop) {
      node.measureInWindow((x, y, w, h) => setGenderAnchor({ x, y, width: w, height: h }));
    }
  }, [isDesktop]);

  // Close the anchored desktop dropdown on viewport resize so it never floats
  // in a stale position (web only).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!genderMenuOpen) return;
    const onResize = () => setGenderMenuOpen(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [genderMenuOpen]);

  const onSelectGender = useCallback((g: ProfileGender | undefined) => {
    setQuery((q) => ({ ...q, gender: g, offset: 0 }));
  }, []);

  const apiItems = data?.items ?? [];

  // Top the deck up before it runs dry, rather than making someone hit the end
  // and wait. Browsing previously stopped at the first twenty full stop.
  useEffect(() => {
    if (!hasMore) return;
    const remaining = apiItems.length - swipedCount;
    if (remaining <= 5) void loadMore();
  }, [hasMore, loadMore, apiItems.length, swipedCount]);
  const items = PREVIEW_BYPASS_AUTH && apiItems.length === 0 ? PREVIEW_PROFILES : apiItems;

  /**
   * Save or unsave, and tell the truth when it fails.
   *
   * This used to swallow every error, so a save that never reached the server
   * still showed as saved. The heart then reverted on the next launch and the
   * profile appeared to have been lost.
   */
  const persistSave = useCallback(
    (id: string, save: boolean) => {
      void (async () => {
        try {
          const client = await factory();
          if (save) await client.saveProfile(id);
          else await client.unsaveProfile(id);
        } catch {
          // Put the heart back the way it was and say so.
          setSaved((prev) => {
            const next = new Set(prev);
            if (save) next.delete(id);
            else next.add(id);
            return next;
          });
          toast.show(
            save ? 'Could not save' : 'Could not remove',
            'That did not reach us. Check your connection and try again.',
          );
        }
      })();
    },
    [factory, toast],
  );

  // Record a deck swipe so the browse query excludes already-actioned profiles
  // (BROWSE-14) and the freemium daily cap is enforced. like also saves the
  // favorite; pass removes it; second_look removes the swipe row (re-surfaces).
  const persistSwipe = useCallback(
    (id: string, action: SwipeAction) => {
      void (async () => {
        try {
          const client = await factory();
          const res = await client.recordSwipe(id, action);
          if (res.capReached && action !== 'second_look') {
            // Running out of likes is the product's main upgrade moment, so it
            // gets a route forward instead of "check back tomorrow", which was
            // a dead end at exactly the point of highest intent. Premium raises
            // the daily cap (plan.features.swipeDailyCap); the Account screen is
            // where that is bought.
            toast.show(
              "You're out of likes for today",
              'Upgrade to Premium for more likes each day, or come back tomorrow.',
              { label: 'See Premium', onPress: () => router.push('/account') },
            );
          }
        } catch {
          /* non-blocking */
        }
      })();
    },
    [factory, toast, router],
  );

  const onSwipe = useCallback(
    (profile: PublicProfileSummary, dir: SwipeDir) => {
      const action: SwipeAction = dir === 'like' ? 'like' : 'pass';
      if (action === 'like') {
        setSaved((s) => new Set(s).add(profile.id));
        toast.show('Liked', `${profile.displayName} added to your Liked.`);
      }
      setSwipedCount((n) => n + 1);
      persistSwipe(profile.id, action);
    },
    [persistSwipe, toast],
  );

  const onSecondLook = useCallback(
    (profile: PublicProfileSummary) => {
      setSaved((s) => {
        const n = new Set(s);
        n.delete(profile.id);
        return n;
      });
      toast.show("He's back!", `You'll see ${profile.displayName} again.`);
      persistSwipe(profile.id, 'second_look');
    },
    [persistSwipe, toast],
  );

  const onSave = useCallback(
    (profile: PublicProfileSummary) => {
      setSaved((s) => {
        const n = new Set(s);
        const willSave = !n.has(profile.id);
        if (willSave) n.add(profile.id);
        else n.delete(profile.id);
        persistSave(profile.id, willSave);
        toast.show(willSave ? 'Liked' : 'Removed', `${profile.displayName} ${willSave ? 'added to' : 'removed from'} your Liked.`);
        return n;
      });
    },
    [persistSave, toast],
  );

  const ageOn = !!(query.ageMin || query.ageMax);
  const hasFilters = !!(query.ageMin || query.ageMax || query.state || query.gender);

  const deck = (
    <View style={[styles.deckHost, isDesktop ? styles.deckHostDesktop : null]}>
      {loading && items.length === 0 ? (
        <DeckSkeleton />
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <ErrorState
            error={error}
            fallback="We couldn't load profiles just now."
            onRetry={refresh}
          />
        </View>
      ) : (
        <ProfileDeck
          items={items}
          saved={saved}
          onSwipe={onSwipe}
          onSecondLook={onSecondLook}
          onSave={onSave}
          onFrontChange={setFrontProfile}
          filtered={hasFilters}
          emptyAction={
            hasFilters ? (
              <Button label="Reset filters" variant="secondary" onPress={() => setQuery({ limit: PAGE_SIZE, offset: 0 })} />
            ) : (
              <Button label="Refresh" variant="secondary" onPress={refresh} />
            )
          }
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <BrandDecor />
      {isDesktop && avatarInitial ? (
        <View style={styles.topline}>
          <Pressable
            onPress={() => router.push('/account' as never)}
            style={({ pressed }: { pressed: boolean }) => [styles.avatar, pressed ? { opacity: 0.8 } : null]}
          >
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Discover meaningful connections</Text>
        <Feather name="heart" size={20} color={colors.primary} />
      </View>

      {/* Tinder-pattern filter row: leading sliders button, then value chips;
          an applied chip renders pink-outlined. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterBar}
      >
        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.fsliders,
            hovered ? styles.fslidersHover : null,
            pressed ? { opacity: 0.8 } : null,
          ]}
        >
          <Feather name="sliders" size={16} color={colors.primary} />
        </Pressable>
        <FilterChip
          label="Age"
          value={formatAgeValue(query.ageMin, query.ageMax)}
          on={ageOn}
          onPress={() => setFiltersOpen(true)}
        />
        <FilterChip
          label="Location"
          value={query.state ?? 'All'}
          on={!!query.state}
          onPress={() => setFiltersOpen(true)}
        />
        <View ref={genderChipRef} collapsable={false}>
          <FilterChip
            label="Gender"
            value={query.gender ? GENDER_LABEL[query.gender] ?? 'Everyone' : 'All'}
            on={!!query.gender}
            onPress={openGenderMenu}
          />
        </View>
        {hasFilters ? (
          <Pressable
            onPress={() => setQuery({ limit: PAGE_SIZE, offset: 0 })}
            style={({ pressed }: { pressed: boolean }) => [styles.reset, pressed ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.resetText}>Reset</Text>
            <Feather name="rotate-ccw" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </ScrollView>

      {isDesktop ? (
        <View style={styles.browseCols}>
          {deck}
          {frontProfile ? <StoryPanel profile={frontProfile} canWrite={saved.has(frontProfile.id)} /> : null}
        </View>
      ) : (
        deck
      )}

      <FilterSheet open={filtersOpen} query={query} onClose={() => setFiltersOpen(false)} onApply={setQuery} />
      <GenderMenu
        open={genderMenuOpen}
        value={query.gender}
        anchor={genderAnchor}
        desktop={isDesktop}
        onClose={() => setGenderMenuOpen(false)}
        onSelect={onSelectGender}
      />
    </View>
  );
}

function FilterChip({
  label,
  value,
  on,
  onPress,
}: {
  label: string;
  value: string;
  on?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.chip,
        on ? styles.chipOn : null,
        hovered && !on ? styles.chipHover : null,
        pressed ? styles.chipPressed : null,
      ]}
    >
      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{label}</Text>
      <Text style={[styles.chipValue, on ? styles.chipValueOn : null]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Transparent so the shell's glow-lit blush background reads continuously
  // across the whole main area (no seam at the 1020px column edge).
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: spacing.lg },
  // Mockup topline: gold-ringed avatar top-right of the content column.
  topline: { position: 'absolute', top: spacing.lg, right: spacing.xl, zIndex: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sidebar,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px rgba(214,168,79,0.6)',
  },
  avatarText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.sidebarText },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  // flexShrink, or the Text keeps its intrinsic width inside the row and the
  // last word is clipped off the screen edge rather than wrapping. Sized to sit
  // on one line at phone widths, as the client screens set it.
  heading: { ...type.h1, fontSize: 20, lineHeight: 26, textAlign: 'center', flexShrink: 1 },
  filterScroll: { flexGrow: 0 },
  filterBar: {
    flexGrow: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  // Filter sliders button: rotates 90deg on hover (mockup micro-interaction).
  fsliders: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { transitionProperty: 'transform, background-color', transitionDuration: '160ms' } as object,
    }),
  },
  fslidersHover: { backgroundColor: colors.primaryFaint, transform: [{ rotate: '90deg' }] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    ...Platform.select({
      web: { transitionProperty: 'border-color, background-color, color', transitionDuration: '160ms' } as object,
    }),
  },
  chipOn: { borderWidth: 1.5, borderColor: colors.primary },
  chipHover: { borderColor: colors.primary },
  chipPressed: { opacity: 0.7 },
  chipText: { ...type.button, fontSize: 13, color: colors.textPrimary },
  chipTextOn: { color: colors.primary },
  chipValue: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted },
  chipValueOn: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  reset: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  resetText: { ...type.button, fontSize: 13, color: colors.primary },
  // Mockup browse-cols: deck column + story panel sit together as one
  // centered unit (gap 44), not spread to opposite edges. Centering this row
  // inside the post-header space creates equal breathing room above the
  // columns and below the action buttons, while each column keeps the same
  // y-origin and visual height.
  browseCols: {
    flex: 1,
    flexDirection: 'row',
    gap: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    paddingHorizontal: spacing.xl,
  },
  deckHost: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, minHeight: 0 },
  // Longhands, not `flex: 0`: RNW expands that to flex-basis 0% which
  // collapses the column's width inside the row. Shrinkable down to 340 so
  // the story panel still fits at narrow desktop widths (900-1100).
  deckHostDesktop: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 500,
    maxWidth: 500,
    minWidth: 340,
    height: '100%',
    maxHeight: 613,
    alignSelf: 'center',
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
