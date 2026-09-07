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

/**
 * Mailbox thread list: avatar, name, preview line.
 *
 * A bare spinner tells someone the app is busy but not what is coming. These
 * hold the shape of the thing being fetched, so the screen does not jump when
 * the real rows arrive.
 */
export function ThreadListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={tl.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={tl.row}>
          <Skeleton style={tl.avatar} />
          <View style={tl.lines}>
            <Skeleton style={tl.name} />
            <Skeleton style={tl.preview} />
          </View>
        </View>
      ))}
    </View>
  );
}

const tl = StyleSheet.create({
  wrap: { gap: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  lines: { flex: 1, gap: 7 },
  name: { height: 14, width: '42%' },
  preview: { height: 12, width: '78%' },
});

/** An open letter thread: alternating bubbles while the messages load. */
export function ThreadDetailSkeleton() {
  return (
    <View style={td.wrap}>
      <View style={td.header}>
        <Skeleton style={td.avatar} />
        <Skeleton style={td.name} />
      </View>
      <View style={td.bubbleIn}>
        <Skeleton style={td.lineFull} />
        <Skeleton style={td.lineMid} />
      </View>
      <View style={td.bubbleOut}>
        <Skeleton style={td.lineFull} />
        <Skeleton style={td.lineShort} />
      </View>
      <View style={td.bubbleIn}>
        <Skeleton style={td.lineMid} />
      </View>
    </View>
  );
}

const td = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { height: 15, width: 130 },
  bubbleIn: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    gap: 7,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleOut: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    gap: 7,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  lineFull: { height: 12, width: 200 },
  lineMid: { height: 12, width: 150 },
  lineShort: { height: 12, width: 90 },
});

/** Generic settings-style rows, for list screens behind an API call. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={ls.card}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[ls.row, i < count - 1 ? ls.divider : null]}>
          <Skeleton style={ls.label} />
          <Skeleton style={ls.value} />
        </View>
      ))}
    </View>
  );
}

const ls = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { height: 13, width: '38%' },
  value: { height: 13, width: 64 },
});

/** Profile detail: the photo block, then name and story beneath it. */
export function ProfileDetailSkeleton() {
  return (
    <View style={pd.wrap}>
      <Skeleton style={pd.photo} />
      <View style={pd.body}>
        <Skeleton style={pd.overline} />
        <Skeleton style={pd.name} />
        <Skeleton style={pd.line} />
        <Skeleton style={pd.line} />
        <Skeleton style={pd.lineShort} />
        <Skeleton style={pd.strip} />
      </View>
    </View>
  );
}

const pd = StyleSheet.create({
  wrap: { flex: 1 },
  photo: { width: '100%', aspectRatio: 5 / 4, borderRadius: 0 },
  body: { padding: spacing.xl, gap: spacing.sm },
  overline: { height: 11, width: '46%' },
  name: { height: 26, width: '58%', marginBottom: 6 },
  line: { height: 13, width: '100%' },
  lineShort: { height: 13, width: '72%' },
  strip: { height: 74, width: '100%', borderRadius: radii.md, marginTop: spacing.md },
});

/**
 * The mailbox letters-remaining card.
 *
 * The card used to draw itself with an empty title while the allowance was
 * still being fetched, then snap to the real numbers, so the top of the mailbox
 * flickered on every visit. This holds the same footprint until the figures are
 * actually known.
 */
export function LettersCardSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <View style={lc.card}>
      <View style={lc.top}>
        <Skeleton style={lc.dot} />
        <Skeleton style={lc.title} />
      </View>
      <Skeleton style={lc.meta} />
      {withAction ? <Skeleton style={lc.action} /> : null}
    </View>
  );
}

const lc = StyleSheet.create({
  card: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  title: { height: 15, width: 110 },
  meta: { height: 12, width: 160, marginTop: 2 },
  action: { height: 42, width: '100%', borderRadius: radii.pill, marginTop: spacing.sm },
});

/** Liked list: avatar tile, name and location — the row shape that screen uses. */
export function LikedListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={lk.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={lk.row}>
          <Skeleton style={lk.avatar} />
          <View style={lk.lines}>
            <Skeleton style={lk.name} />
            <Skeleton style={lk.meta} />
          </View>
          <Skeleton style={lk.chevron} />
        </View>
      ))}
    </View>
  );
}

const lk = StyleSheet.create({
  wrap: { gap: spacing.md, width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 54, height: 54, borderRadius: radii.md },
  lines: { flex: 1, gap: 8 },
  name: { height: 16, width: '46%' },
  meta: { height: 12, width: '24%' },
  chevron: { width: 10, height: 16, borderRadius: 3 },
});
