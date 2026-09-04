import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '../theme';

/**
 * A profile photo, or a branded stand-in when there isn't one.
 *
 * Two cases produce no image, and both used to render the same grey box with
 * "No photo" in it, which read as a broken card rather than a deliberate one:
 *   - the profile genuinely has no approved photo yet
 *   - the presigned S3 URL fails (expired, or the object is missing — which is
 *     every photo when storage is unconfigured, as in local dev)
 * The second case only shows up at render time, so the fallback has to be
 * driven by `onError`, not just by a null URL.
 */

const GRADIENTS: ReadonlyArray<readonly [string, string, string]> = [
  ['#2E1240', '#451A5E', '#5A2178'],
  ['#1B0826', '#3A1550', '#4E1A6B'],
  ['#2A1038', '#3F1858', '#552073'],
];

/** Stable per-person gradient so a card looks like itself between renders. */
function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function initialOf(name?: string | null) {
  const c = name?.trim()?.[0];
  return c ? c.toUpperCase() : null;
}

export function PhotoPlaceholder({
  name,
  style,
  compact,
  showCaption,
}: {
  name?: string | null;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  showCaption?: boolean;
}) {
  const initial = initialOf(name);
  const g = gradientFor(name ?? 'heartlink');
  return (
    <View style={[styles.fill, style]}>
      <LinearGradient colors={[...g]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        {initial ? (
          <View style={[styles.ring, compact ? styles.ringCompact : null]}>
            <Text style={[styles.initial, compact ? styles.initialCompact : null]}>{initial}</Text>
          </View>
        ) : (
          <Feather name="user" size={compact ? 22 : 34} color={colors.goldBright} />
        )}
        {!compact && showCaption !== false ? (
          <View style={styles.captionRow}>
            <Feather name="camera-off" size={12} color={colors.sidebarTextMuted} />
            <Text style={styles.caption}>Photo coming soon</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

type ProfilePhotoProps = {
  uri?: string | null;
  name?: string | null;
  style?: StyleProp<ViewStyle>;
  priority?: 'low' | 'normal' | 'high';
  compact?: boolean;
  /** Off where the parent already draws text over the photo. */
  showCaption?: boolean;
};

export function ProfilePhoto({ uri, name, style, priority = 'normal', compact, showCaption }: ProfilePhotoProps) {
  const [failed, setFailed] = useState(false);
  // A new uri deserves a fresh attempt; without this a recycled card keeps the
  // previous person's failure.
  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed)
    return <PhotoPlaceholder name={name} style={style} compact={compact} showCaption={showCaption} />;

  return (
    <Image
      source={{ uri }}
      style={[styles.fill, style] as StyleProp<ImageStyle>}
      contentFit="cover"
      transition={80}
      cachePolicy="memory-disk"
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14 },
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(214, 168, 79, 0.55)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCompact: { width: 54, height: 54, borderRadius: 27 },
  initial: { fontFamily: fonts.heading, fontSize: 40, color: colors.goldBright },
  initialCompact: { fontSize: 22 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caption: { fontFamily: fonts.body, fontSize: 12, color: colors.sidebarTextMuted },
});
