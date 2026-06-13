import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { FilterSheet } from '../../src/components/FilterSheet';
import { ProfileDeck, type SwipeDir } from '../../src/components/ProfileDeck';
import { DeckSkeleton } from '../../src/components/Skeleton';
import { useToast } from '../../src/components/Toast';
import { ValueProps } from '../../src/components/ValueProps';
import { Button } from '../../src/components/primitives';
import type { ListPublicProfilesQuery, PublicProfileSummary } from '../../src/lib/api';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { usePublicProfiles } from '../../src/lib/use-public-profiles';
import { colors, radii, spacing, type } from '../../src/theme';

const PAGE_SIZE = 20;

// DEBUG build stamp — bump this string on each deploy to confirm the live
// bundle is current (it renders under the Home heading). Remove once stable.
const BUILD_TAG = 'dbg-C';

const GENDER_LABEL: Record<string, string> = { male: 'Men', female: 'Women', both: 'Both' };

export default function HomeScreen() {
  const factory = useApiClientFactory();
  const toast = useToast();
  const [query, setQuery] = useState<ListPublicProfilesQuery>({ limit: PAGE_SIZE, offset: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, loading, error, refresh } = usePublicProfiles(query);
  const { width } = useWindowDimensions();
  const showValueProps = width >= 900;

  const items = data?.items ?? [];

  // Like persists a favorite; Second Look undoes it. Both best-effort — a failed
  // save shouldn't block the browse interaction.
  const onSwipe = useCallback(
    (profile: PublicProfileSummary, dir: SwipeDir) => {
      if (dir !== 'like') return;
      toast.show('Liked', `${profile.displayName} added to your Liked.`);
      void (async () => {
        try {
          const client = await factory();
          await client.saveProfile(profile.id);
        } catch {
          /* non-blocking */
        }
      })();
    },
    [factory, toast],
  );

  const onSecondLook = useCallback(
    (profile: PublicProfileSummary) => {
      toast.show("He's back!", `You'll see ${profile.displayName} again.`);
      void (async () => {
        try {
          const client = await factory();
          await client.unsaveProfile(profile.id);
        } catch {
          /* non-blocking */
        }
      })();
    },
    [factory, toast],
  );

  const ageLabel =
    query.ageMin || query.ageMax ? `Age ${query.ageMin ?? 18}-${query.ageMax ?? 99}` : 'Age: All';
  const locLabel = query.state ? `Location: ${query.state}` : 'Location: All';
  const genderLabel = query.gender ? `Gender: ${GENDER_LABEL[query.gender] ?? query.gender}` : 'Gender: All';
  const hasFilters = !!(query.ageMin || query.ageMax || query.state || query.facilityId || query.planTier || query.gender);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Discover meaningful connections</Text>
        <Text style={styles.buildTag}>build: {BUILD_TAG}</Text>

        <View style={styles.filterBar}>
          {[ageLabel, locLabel, genderLabel].map((label, i) => (
            <Pressable
              key={i}
              onPress={() => setFiltersOpen(true)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.chip,
                hovered ? styles.chipHover : null,
                pressed ? styles.chipPressed : null,
              ]}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
          {hasFilters ? (
            <Pressable
              onPress={() => setQuery({ limit: PAGE_SIZE, offset: 0 })}
              style={({ pressed }: { pressed: boolean }) => [styles.reset, pressed ? { opacity: 0.6 } : null]}
            >
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.deckHost}>
          {loading && items.length === 0 ? (
            <DeckSkeleton />
          ) : error ? (
            <View style={styles.center}>
              <Text style={type.h2}>Couldn't load profiles</Text>
              <Text style={[type.bodyMuted, { textAlign: 'center' }]} selectable>{error}</Text>
              <Button label="Try again" variant="secondary" onPress={refresh} />
            </View>
          ) : (
            <ProfileDeck items={items} onSwipe={onSwipe} onSecondLook={onSecondLook} />
          )}
        </View>

        {showValueProps ? <ValueProps /> : null}
      </ScrollView>

      <FilterSheet open={filtersOpen} query={query} onClose={() => setFiltersOpen(false)} onApply={setQuery} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { flexGrow: 1, paddingTop: spacing.lg },
  heading: { ...type.h1, textAlign: 'center', marginBottom: spacing.xs },
  buildTag: {
    textAlign: 'center',
    fontSize: 11,
    opacity: 0.55,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipHover: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  chipPressed: { opacity: 0.7 },
  chipText: { ...type.button, fontSize: 13, color: colors.textPrimary },
  reset: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  resetText: { ...type.button, fontSize: 13, color: colors.primary },
  deckHost: { flex: 1, minHeight: 520, paddingHorizontal: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
