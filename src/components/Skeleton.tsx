import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme';

/** A single pulsing placeholder block. */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[base.block, { opacity }, style]} />;
}

const base = StyleSheet.create({
  block: { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm },
});

/** Deck-shaped loading state for the Home browse screen. */
export function DeckSkeleton() {
  return (
    <View style={ds.area}>
      <View style={ds.card}>
        <Skeleton style={ds.image} />
        <View style={ds.body}>
          <Skeleton style={ds.lineLg} />
          <Skeleton style={ds.lineMd} />
          <Skeleton style={ds.lineSm} />
        </View>
      </View>
      <View style={ds.actions}>
        <Skeleton style={ds.circle} />
        <Skeleton style={ds.circle} />
        <Skeleton style={ds.circle} />
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  // The placeholder has to live inside whatever height it is given. It
  // previously sized itself from a fixed aspect ratio and could grow taller
  // than its container, spilling over the surrounding screen on a short
  // viewport before the real deck replaced it.
  area: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 0.72,
    // Keeps the shape when there is room, and gives it up rather than
    // overflowing when there is not.
    flexShrink: 1,
    minHeight: 0,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  image: { flex: 1, borderRadius: 0 },
  body: { padding: spacing.lg, gap: spacing.sm },
  lineLg: { height: 22, width: '55%' },
  lineMd: { height: 14, width: '75%' },
  lineSm: { height: 14, width: '90%' },
  actions: { flexDirection: 'row', gap: spacing.xl, flexShrink: 0 },
  circle: { width: 60, height: 60, borderRadius: radii.pill },
});

/** Grid of card skeletons for the Liked screen. */
export function GridSkeleton({ count = 6, columns = 1 }: { count?: number; columns?: number }) {
  return (
    <View style={gs.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[gs.col, { width: `${100 / columns}%` }]}>
          <View style={gs.card}>
            <Skeleton style={gs.image} />
            <View style={gs.body}>
              <Skeleton style={gs.lineLg} />
              <Skeleton style={gs.lineSm} />
              <Skeleton style={gs.btn} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const gs = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm },
  col: { padding: spacing.sm },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 1, borderRadius: 0 },
  body: { padding: spacing.lg, gap: spacing.sm },
  lineLg: { height: 18, width: '60%' },
  lineSm: { height: 13, width: '85%' },
  btn: { height: 36, width: '100%', borderRadius: radii.md, marginTop: spacing.xs },
});
