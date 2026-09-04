import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { PublicProfileSummary } from '../lib/api';
import { ProfilePhoto } from './ProfilePhoto';
import { usePublicProfile } from '../lib/use-public-profiles';
import { colors, fonts, radii, spacing, type } from '../theme';

interface ProfileCardProps {
  profile: PublicProfileSummary;
  focused?: boolean;
}

export function ProfileCard({ profile, focused }: ProfileCardProps) {
  const router = useRouter();
  const detail = usePublicProfile(profile.id).data;
  const chips = [
    ...(detail?.interests?.filter(Boolean).slice(0, 3) ?? []),
    ...(detail?.acceptsMail ? ['Accepts mail'] : []),
  ];
  const bio = detail?.bio || profile.bioExcerpt;

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
        <ProfilePhoto
          uri={profile.primaryPhotoUrl}
          name={profile.displayName}
          style={styles.image}
          priority={focused ? 'high' : 'normal'}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.photoTint} />
          <LinearGradient
            colors={['rgba(22, 5, 31, 0)', 'rgba(22, 5, 31, 0.34)', colors.scrimStrong]}
            locations={[0, 0.45, 1]}
            style={styles.scrim}
          />
        </View>
        {/* Shown only when staff recorded an identity check. It was previously
            on every card, which made the claim meaningless. */}
        {profile.isVerified ? (
          <View style={styles.verifiedBadge} pointerEvents="none">
            <Feather name="shield" size={13} color={colors.goldBright} />
            <Text style={styles.verifiedBadgeText}>Verified Profile</Text>
          </View>
        ) : null}
        <View style={styles.saveBadge} pointerEvents="none">
          <Feather name="heart" size={16} color={colors.textSecondary} />
        </View>

        <View style={styles.identity} pointerEvents="none">
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.displayName}
            </Text>
            {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
            <Feather name="shield" size={15} color={colors.goldBright} />
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.location}>{profile.facility.state}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {bio ? (
          <View style={styles.quoteRow}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.bio} numberOfLines={3}>
              {bio}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    boxShadow: '0 18px 40px rgba(46, 18, 64, 0.14)',
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.997 }] },
  cardHovered: {
    borderColor: colors.borderStrong,
    transform: [{ translateY: -3 }],
    boxShadow: '0 22px 44px rgba(46, 18, 64, 0.16)',
  },
  cardFocused: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primary}, 0 22px 44px rgba(46, 18, 64, 0.16)`,
  },
  imageWrap: { position: 'relative', aspectRatio: 4 / 5, backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { ...type.caption, color: colors.textMuted },
  verifiedBadge: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 5, 31, 0.55)',
    borderWidth: 1,
    borderColor: colors.goldBright,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    boxShadow: '0 2px 8px rgba(22, 5, 31, 0.30)',
  },
  verifiedBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.goldBright },
  photoTint: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.photoTint },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  identity: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, gap: spacing.xs },
  saveBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(46, 18, 64, 0.18)',
  },
  body: { padding: spacing.lg, gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: fonts.heading, fontSize: 22, color: '#FFFFFF', flexShrink: 1 },
  age: { fontFamily: fonts.bodyMedium, fontSize: 17, color: 'rgba(255,255,255,0.88)' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  location: { ...type.caption, color: 'rgba(255,255,255,0.75)' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 115, 0.22)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primaryHover },
  quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  quoteMark: { fontFamily: 'BreeSerif_400Regular', fontSize: 24, lineHeight: 24, color: colors.primary },
  bio: { ...type.body, color: colors.textSecondary, flex: 1, fontStyle: 'italic' },
});
