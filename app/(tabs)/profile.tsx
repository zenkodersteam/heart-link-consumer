import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Pill } from '../../src/components/primitives';
import type { PublicProfilePhoto } from '../../src/lib/api';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { usePublicProfile } from '../../src/lib/use-public-profiles';
import { colors, radii, spacing, type } from '../../src/theme';

const MAX_CONTENT_WIDTH = 720;

const PLAN_LABEL: Record<'basic' | 'diamond' | 'vip', string> = {
  basic: 'Basic',
  diamond: 'Diamond',
  vip: 'VIP',
};

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { data, loading, error } = usePublicProfile(typeof id === 'string' ? id : undefined);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const factory = useApiClientFactory();

  async function toggleSave(profileId: string) {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      const client = await factory();
      if (nextSaved) await client.saveProfile(profileId);
      else await client.unsaveProfile(profileId);
    } catch {
      setSaved(!nextSaved); // revert on failure
    }
  }
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const heroWidth = contentWidth - spacing.xl * 2;

  if (!id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Text style={type.h2}>No profile selected</Text>
          <Button label="Back to browse" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Text style={type.h2}>Profile not found</Text>
          <Text style={type.bodyMuted}>{error ?? 'It may have been removed.'}</Text>
          <Button label="Back to browse" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  const photos = data.photos ?? [];
  const activePhoto: PublicProfilePhoto | undefined = photos[activePhotoIdx];
  const facilityLine = [data.facility.city, data.facility.state].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnLabel}>← Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={[styles.scroll, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth }}>
          <View style={styles.gallery}>
            {activePhoto ? (
              <Image
                source={{ uri: activePhoto.presignedUrl }}
                style={[styles.heroImage, { width: heroWidth, height: heroWidth * 1.15 }]}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder, { width: heroWidth, height: heroWidth * 1.15 }]}>
                <Text style={type.caption}>No photo</Text>
              </View>
            )}

            {photos.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}
              >
                {photos.map((p, idx) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setActivePhotoIdx(idx)}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      hovered ? { opacity: 0.92 } : null,
                      pressed ? { opacity: 0.8 } : null,
                    ]}
                  >
                    <Image
                      source={{ uri: p.presignedUrl }}
                      style={[styles.thumb, idx === activePhotoIdx ? styles.thumbActive : null]}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{data.displayName}</Text>
              {data.age != null ? <Text style={styles.age}>{data.age}</Text> : null}
            </View>
            <View style={styles.metaRow}>
              <Pill label="Verified Profile" tone="pink" />
              {data.planTier ? <Pill label={PLAN_LABEL[data.planTier]} tone="gold" /> : null}
              {facilityLine ? <Pill label={facilityLine} tone="neutral" /> : null}
            </View>
            <Text style={styles.facility}>{data.facility.name}</Text>
            <View style={styles.likeRow}>
              <Button
                label={saved ? '♥ Liked' : '♥ Like'}
                variant={saved ? 'secondary' : 'primary'}
                onPress={() => toggleSave(data.id)}
              />
            </View>
          </View>

          {data.bio ? (
            <Card style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.bio}>{data.bio}</Text>
            </Card>
          ) : null}

          <Card style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <DetailRow label="Facility" value={data.facility.name} />
            <DetailRow label="Location" value={facilityLine || '—'} />
            {data.releaseDate ? (
              <DetailRow label="Expected release" value={formatDate(data.releaseDate)} />
            ) : null}
            {data.locationDescription ? (
              <DetailRow label="Description" value={data.locationDescription} />
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.lg },
  label: { ...type.label, flexShrink: 0 },
  value: { ...type.body, color: colors.textPrimary, flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backBtnLabel: { ...type.button, color: colors.primary, fontSize: 15 },
  scroll: { paddingBottom: spacing.xxl },
  gallery: { paddingHorizontal: spacing.xl, gap: spacing.md },
  heroImage: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumb: { width: 64, height: 64, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  thumbActive: { borderColor: colors.primary, borderWidth: 2 },
  headerBlock: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  name: { ...type.display, fontSize: 28 },
  age: { ...type.h1, color: colors.gold },
  metaRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  facility: { ...type.bodyMuted },
  likeRow: { marginTop: spacing.md, alignSelf: 'flex-start', minWidth: 160 },
  section: { marginHorizontal: spacing.xl, marginTop: spacing.lg, gap: spacing.sm },
  sectionLabel: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  bio: { ...type.body, lineHeight: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
});
