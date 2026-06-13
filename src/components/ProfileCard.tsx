import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PublicProfileSummary } from '../lib/api';
import { colors, radii, spacing, type } from '../theme';
import { Pill } from './primitives';

interface ProfileCardProps {
  profile: PublicProfileSummary;
  focused?: boolean;
}

const PLAN_LABEL: Record<NonNullable<PublicProfileSummary['planTier']>, string> = {
  basic: 'Basic',
  diamond: 'Diamond',
  vip: 'VIP',
};

export function ProfileCard({ profile, focused }: ProfileCardProps) {
  const router = useRouter();
  const meta = [
    profile.age != null ? `${profile.age}` : null,
    profile.facility.city ? profile.facility.city : null,
    profile.facility.state,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${profile.displayName}'s profile`}
      tabIndex={-1}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.card,
        hovered ? styles.cardHovered : null,
        focused ? styles.cardFocused : null,
        pressed ? styles.cardPressed : null,
      ]}
      onPress={() => router.push(`/(tabs)/profile?id=${profile.id}`)}
    >
      <View style={styles.imageWrap}>
        {profile.primaryPhotoUrl ? (
          <Image
            source={{ uri: profile.primaryPhotoUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}
        {profile.planTier ? (
          <View style={styles.planBadge}>
            <Pill label={PLAN_LABEL[profile.planTier]} tone="gold" />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.displayName}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <Text style={styles.facility} numberOfLines={1}>
          {profile.facility.name}
        </Text>
        {profile.bioExcerpt ? (
          <Text style={styles.bio} numberOfLines={3}>
            {profile.bioExcerpt}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.997 }] },
  cardHovered: {
    borderColor: colors.borderStrong,
    transform: [{ translateY: -2 }],
    boxShadow: '0 10px 28px rgba(46, 18, 64, 0.12)',
  },
  cardFocused: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primary}, 0 10px 28px rgba(46, 18, 64, 0.12)`,
  },
  imageWrap: { position: 'relative', aspectRatio: 4 / 5, backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { ...type.caption, color: colors.textMuted },
  planBadge: { position: 'absolute', top: spacing.md, right: spacing.md },
  body: { padding: spacing.lg, gap: spacing.xs },
  name: { ...type.h2 },
  meta: { ...type.caption, color: colors.gold },
  facility: { ...type.bodyMuted, fontSize: 13 },
  bio: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
});
