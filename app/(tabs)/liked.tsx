import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { GridSkeleton } from '../../src/components/Skeleton';
import { Button } from '../../src/components/primitives';
import type { PublicProfileSummary } from '../../src/lib/api';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { colors, radii, spacing, type } from '../../src/theme';

function columnsForWidth(w: number): number {
  if (w >= 1100) return 3;
  if (w >= 700) return 2;
  return 1;
}

export default function LikedScreen() {
  const factory = useApiClientFactory();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cols = columnsForWidth(width);

  const [items, setItems] = useState<PublicProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await factory();
      const res = await client.listSavedProfiles();
      setItems(res.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved profiles.');
    } finally {
      setLoading(false);
    }
  }, [factory]);

  useEffect(() => {
    void load();
  }, [load]);

  const unsave = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((p) => p.id !== id)); // optimistic
      try {
        const client = await factory();
        await client.unsaveProfile(id);
      } catch {
        void load(); // reconcile on failure
      }
    },
    [factory, load],
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Liked or Saved Profiles</Text>
      <Text style={styles.sub}>Profiles you've liked or saved for later.</Text>

      {loading ? (
        <GridSkeleton count={6} columns={cols} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={type.h2}>Couldn't load</Text>
          <Text style={[type.bodyMuted, { textAlign: 'center' }]} selectable>{error}</Text>
          <Button label="Try again" variant="secondary" onPress={load} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={type.h2}>No liked profiles yet</Text>
          <Text style={[type.bodyMuted, { textAlign: 'center' }]}>
            Like someone on the Home screen and they'll show up here.
          </Text>
          <Button label="Browse profiles" onPress={() => router.push('/')} />
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((p) => {
            const meta = [p.facility.city, p.facility.state].filter(Boolean).join(', ');
            return (
              <View key={p.id} style={[styles.cardCol, { width: `${100 / cols}%` }]}>
                <View style={styles.card}>
                  <Pressable onPress={() => router.push(`/(tabs)/profile?id=${p.id}`)}>
                    <View style={styles.imageWrap}>
                      {p.primaryPhotoUrl ? (
                        <Image source={{ uri: p.primaryPhotoUrl }} style={styles.image} contentFit="cover" transition={120} />
                      ) : (
                        <View style={[styles.image, styles.placeholder]}>
                          <Text style={type.caption}>No photo</Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => unsave(p.id)}
                        hitSlop={8}
                        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                          styles.heart,
                          hovered ? { transform: [{ scale: 1.1 }] } : null,
                          pressed ? { transform: [{ scale: 0.85 }] } : null,
                        ]}
                      >
                        <Text style={styles.heartGlyph}>♥</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>{p.displayName}</Text>
                      {p.age != null ? <Text style={styles.age}>{p.age}</Text> : null}
                    </View>
                    <Text style={styles.facility} numberOfLines={1}>
                      {p.facility.name}{meta ? `  •  ${meta}` : ''}
                    </Text>
                    <Button label="View Profile" variant="secondary" onPress={() => router.push(`/(tabs)/profile?id=${p.id}`)} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl },
  heading: { ...type.h1, textAlign: 'center' },
  sub: { ...type.bodyMuted, textAlign: 'center', marginBottom: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
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
  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlyph: { color: colors.primary, fontSize: 18, lineHeight: 20 },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { ...type.h2, flexShrink: 1 },
  age: { ...type.body, color: colors.gold, fontFamily: 'Inter_600SemiBold' },
  facility: { ...type.caption },
});
