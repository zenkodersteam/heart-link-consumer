import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { PublicProfileSummary } from '../lib/api';
import { colors, radii, spacing, type } from '../theme';
import { Pill } from './primitives';

export type SwipeDir = 'like' | 'pass';

interface ProfileDeckProps {
  items: PublicProfileSummary[];
  onSwipe?: (profile: PublicProfileSummary, dir: SwipeDir) => void;
  onSecondLook?: (profile: PublicProfileSummary) => void;
  onExhausted?: () => void;
}

const PLAN_LABEL: Record<NonNullable<PublicProfileSummary['planTier']>, string> = {
  basic: 'Basic',
  diamond: 'Diamond',
  vip: 'VIP',
};

const SWIPE_THRESHOLD = 110;
const CARD_MAX_WIDTH = 420;

export function ProfileDeck({ items, onSwipe, onSecondLook, onExhausted }: ProfileDeckProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  // Reset to the top of a fresh result set when the items identity changes.
  const itemsKey = items.map((i) => i.id).join(',');
  const lastKey = useRef(itemsKey);
  if (lastKey.current !== itemsKey) {
    lastKey.current = itemsKey;
    if (index !== 0) setIndex(0);
    position.setValue({ x: 0, y: 0 });
  }

  const screenW = Dimensions.get('window').width;

  const advance = useCallback(
    (dir: SwipeDir) => {
      const profile = items[index];
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => {
        const next = i + 1;
        if (next >= items.length) onExhausted?.();
        return next;
      });
      if (profile) onSwipe?.(profile, dir);
    },
    [index, items, onExhausted, onSwipe, position],
  );

  const forceSwipe = useCallback(
    (dir: SwipeDir) => {
      const toX = dir === 'like' ? screenW + 120 : -screenW - 120;
      Animated.timing(position, {
        toValue: { x: toX, y: 0 },
        duration: 220,
        useNativeDriver: false,
      }).start(() => advance(dir));
    },
    [advance, position, screenW],
  );

  const reset = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 6,
    }).start();
  }, [position]);

  const secondLook = useCallback(() => {
    setIndex((i) => {
      if (i === 0) return i;
      const restored = items[i - 1];
      if (restored) onSecondLook?.(restored);
      return i - 1;
    });
    position.setValue({ x: 0, y: 0 });
  }, [items, onSecondLook, position]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6,
        onPanResponderMove: (_e, g) => {
          position.setValue({ x: g.dx, y: g.dy * 0.2 });
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dx > SWIPE_THRESHOLD) forceSwipe('like');
          else if (g.dx < -SWIPE_THRESHOLD) forceSwipe('pass');
          else reset();
        },
      }),
    [forceSwipe, position, reset],
  );

  const rotate = position.x.interpolate({
    inputRange: [-screenW / 2, 0, screenW / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const current = items[index];
  const next = items[index + 1];

  if (!current) {
    return (
      <View style={styles.deckArea}>
        <View style={styles.emptyCard}>
          <Text style={type.h2}>You're all caught up</Text>
          <Text style={[type.bodyMuted, { textAlign: 'center' }]}>
            No more profiles match right now. Adjust your filters or check back soon.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.deckArea}>
      <View style={styles.stack}>
        {next ? (
          <View style={[styles.cardWrap, styles.cardBehind]} pointerEvents="none">
            <DeckCard profile={next} />
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.cardWrap,
            {
              transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, styles.stampTextLike]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
            <Text style={[styles.stampText, styles.stampTextPass]}>PASS</Text>
          </Animated.View>

          <Pressable
            style={styles.cardPressable}
            onPress={() => router.push(`/(tabs)/profile?id=${current.id}`)}
          >
            <DeckCard profile={current} />
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <ActionButton variant="pass" label="Pass" onPress={() => forceSwipe('pass')} />
        <ActionButton variant="second" label="Second Look" onPress={secondLook} disabled={index === 0} />
        <ActionButton variant="like" label="Like" onPress={() => forceSwipe('like')} />
      </View>
    </View>
  );
}

function DeckCard({ profile }: { profile: PublicProfileSummary }) {
  const meta = [profile.facility.city, profile.facility.state].filter(Boolean).join(', ');
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {profile.primaryPhotoUrl ? (
          <Image source={{ uri: profile.primaryPhotoUrl }} style={styles.image} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}
        <View style={styles.verified}>
          <Pill label="Verified Profile" tone="pink" />
        </View>
        {profile.planTier ? (
          <View style={styles.planBadge}>
            <Pill label={PLAN_LABEL[profile.planTier]} tone="gold" />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
          {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
        </View>
        <Text style={styles.facility} numberOfLines={1}>
          {profile.facility.name}{meta ? `  •  ${meta}` : ''}
        </Text>
        {profile.bioExcerpt ? (
          <Text style={styles.bio} numberOfLines={3}>{profile.bioExcerpt}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  variant,
  label,
  onPress,
  disabled,
}: {
  variant: 'pass' | 'second' | 'like';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const ring =
    variant === 'like' ? colors.primary : variant === 'second' ? colors.gold : colors.textMuted;
  const glyph = variant === 'like' ? '♥' : variant === 'second' ? '↺' : '✕';
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => {
        const active = (pressed || hovered) && !disabled;
        return (
          <View style={[styles.actionWrap, pressed && !disabled ? { transform: [{ scale: 0.9 }] } : null]}>
            <View
              style={[
                styles.actionCircle,
                { borderColor: ring },
                active ? { backgroundColor: ring } : null,
                disabled ? styles.actionDisabled : null,
              ]}
            >
              <Text style={[styles.actionGlyph, { color: active ? colors.bgElevated : ring }]}>{glyph}</Text>
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  stack: { width: '100%', maxWidth: CARD_MAX_WIDTH, aspectRatio: 0.72, alignSelf: 'center' },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // The tappable wrapper must fill the card area; without flex it collapses to
  // its text height, exposing the next card behind it.
  cardPressable: { flex: 1 },
  cardBehind: { transform: [{ scale: 0.95 }, { translateY: 12 }], opacity: 0.6 },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    boxShadow: '0 14px 36px rgba(46, 18, 64, 0.14)',
  },
  imageWrap: { flex: 1, position: 'relative', backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { ...type.caption, color: colors.textMuted },
  verified: { position: 'absolute', top: spacing.md, left: spacing.md },
  planBadge: { position: 'absolute', top: spacing.md, right: spacing.md },
  body: { padding: spacing.lg, gap: spacing.xs, backgroundColor: colors.bgCard },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { ...type.h1, fontSize: 24, flexShrink: 1 },
  age: { ...type.h2, color: colors.gold },
  facility: { ...type.bodyMuted, fontSize: 13 },
  bio: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  emptyCard: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stamp: {
    position: 'absolute',
    top: spacing.xl,
    zIndex: 5,
    borderWidth: 3,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stampLike: { right: spacing.xl, borderColor: colors.primary, transform: [{ rotate: '12deg' }] },
  stampPass: { left: spacing.xl, borderColor: colors.textMuted, transform: [{ rotate: '-12deg' }] },
  stampText: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: 2 },
  stampTextLike: { color: colors.primary },
  stampTextPass: { color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start', justifyContent: 'center' },
  actionWrap: { alignItems: 'center', gap: spacing.xs },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    borderWidth: 2,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: { opacity: 0.4 },
  actionGlyph: { fontSize: 24, lineHeight: 28 },
  actionLabel: { ...type.caption },
});
