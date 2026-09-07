import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { PublicProfileSummary } from '@heartlink/consumer-api';
import { ProfilePhoto } from './ProfilePhoto';
import { stateName } from '@heartlink/consumer-api';
import { useApiClientFactory } from '../lib/use-api-client';
import { usePublicProfile } from '../lib/use-public-profiles';
import { colors, fonts, radii, spacing, type } from '../theme';

export type SwipeDir = 'like' | 'pass';

interface ProfileDeckProps {
  items: PublicProfileSummary[];
  saved?: Set<string>;
  onSwipe?: (profile: PublicProfileSummary, dir: SwipeDir) => void;
  onSecondLook?: (profile: PublicProfileSummary) => void;
  onSave?: (profile: PublicProfileSummary) => void;
  onExhausted?: () => void;
  /** Reports the profile currently on top (drives the desktop story panel). */
  onFrontChange?: (profile: PublicProfileSummary | null) => void;
  /** Action offered when the deck runs dry (e.g. reset filters). */
  emptyAction?: ReactNode;
  /** True when filters are narrowing the deck, so the copy can say so. */
  filtered?: boolean;
}

const SWIPE_THRESHOLD = 110;
// Pull-down distance that brings the last card back. Higher than the sideways
// threshold on purpose: undo should take a deliberate tug, not a stray drag.
const SECOND_LOOK_THRESHOLD = 130;
const CARD_MAX_WIDTH = 380;
const DESKTOP_BREAKPOINT = 900;
const IMPRESSION_SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Smooth easing on web for hover/press feedback (native ignores these keys).
const webTransition =
  Platform.OS === 'web'
    ? {
        transitionProperty: 'transform, box-shadow, background-color, opacity',
        transitionDuration: '200ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : null;

// On web the swipe is a mouse-drag, which the browser also interprets as text
// selection + image drag. Suppress both on the deck so dragging only swipes.
const webNoSelect: Record<string, string> | null =
  Platform.OS === 'web' ? { userSelect: 'none', cursor: 'grab' } : null;

function formatRelease(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function ProfileDeck({ items, saved, onSwipe, onSecondLook, onSave, onExhausted, onFrontChange, emptyAction, filtered }: ProfileDeckProps) {
  const router = useRouter();
  const makeClient = useApiClientFactory();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  // Direction the last card was dismissed, so Second Look can bring it back in
  // from the same side it left.
  const lastDir = useRef<SwipeDir>('like');

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
      lastDir.current = dir;
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
      const toX = dir === 'like' ? screenW + 140 : -screenW - 140;
      Animated.timing(position, {
        toValue: { x: toX, y: -40 },
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => advance(dir));
    },
    [advance, position, screenW],
  );

  const reset = useCallback(() => {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7, tension: 80 }).start();
  }, [position]);

  const canSecondLook = index > 0;

  const secondLook = useCallback(() => {
    if (index === 0) return;
    const restored = items[index - 1];
    setIndex(index - 1);
    if (restored) onSecondLook?.(restored);
    // Start off-screen on the side the card left, then spring back to center -
    // the behind cards (driven by position.x) sink back as it returns.
    const fromX = (lastDir.current === 'like' ? 1 : -1) * (screenW + 140);
    position.setValue({ x: fromX, y: -40 });
    Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 7, tension: 70, useNativeDriver: false }).start();
  }, [index, items, onSecondLook, position, screenW]);

  // True while the current drag is being read as a pull-down for Second Look,
  // rather than a sideways like/pass. Decided during the drag and remembered
  // until release, so a gesture cannot change meaning halfway through.
  const pullingBack = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 6 || (canSecondLook && g.dy > 6),
        onPanResponderMove: (_e, g) => {
          // A drag counts as a pull-back only when it is downward and clearly
          // more vertical than horizontal, so ordinary swipes are unaffected.
          const isPull = canSecondLook && g.dy > 0 && g.dy > Math.abs(g.dx) * 1.2;
          pullingBack.current = isPull;
          position.setValue({
            // Sideways movement is damped during a pull-back so the card does
            // not drift toward like or pass while it is being tugged down.
            x: isPull ? g.dx * 0.2 : g.dx,
            y: isPull ? g.dy * 0.55 : g.dy * 0.25,
          });
        },
        onPanResponderRelease: (_e, g) => {
          const wasPull = pullingBack.current;
          pullingBack.current = false;

          if (wasPull) {
            if (g.dy > SECOND_LOOK_THRESHOLD) secondLook();
            else reset();
            return;
          }
          if (g.dx > SWIPE_THRESHOLD) forceSwipe('like');
          else if (g.dx < -SWIPE_THRESHOLD) forceSwipe('pass');
          else reset();
        },
        onPanResponderTerminate: () => {
          pullingBack.current = false;
          reset();
        },
      }),
    [canSecondLook, forceSwipe, position, reset, secondLook],
  );

  const rotate = position.x.interpolate({
    inputRange: [-screenW / 2, 0, screenW / 2],
    outputRange: ['-9deg', '0deg', '9deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({ inputRange: [20, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  // y is damped to 0.55 of the finger during a pull-back, so the stamp reaches
  // full strength at the same moment the gesture would commit.
  const secondLookOpacity = position.y.interpolate({
    inputRange: [12, SECOND_LOOK_THRESHOLD * 0.55],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // As the front card is dragged/flung either way, the cards behind it rise
  // toward the front position so the next card is already in place when the
  // front leaves - no snap between states.
  const T = SWIPE_THRESHOLD;
  // Peek offsets are large enough that the behind cards read as a real stack
  // (a visible band of photo + white card edge), not a grey sliver.
  const behind1Style = {
    opacity: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: [1, 1, 1], extrapolate: 'clamp' }),
    transform: [
      { scale: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: [1, 0.96, 1], extrapolate: 'clamp' }) },
      { translateX: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: [0, 22, 0], extrapolate: 'clamp' }) },
      { rotate: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: ['0deg', '3.5deg', '0deg'], extrapolate: 'clamp' }) },
    ],
  };
  const behind2Style = {
    opacity: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: [1, 0.85, 1], extrapolate: 'clamp' }),
    transform: [
      { scale: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: [0.96, 0.92, 0.96], extrapolate: 'clamp' }) },
      { translateX: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: [22, 44, 22], extrapolate: 'clamp' }) },
      { rotate: position.x.interpolate({ inputRange: [-T, 0, T], outputRange: ['3.5deg', '7deg', '3.5deg'], extrapolate: 'clamp' }) },
    ],
  };

  const current = items[index];
  const next = items[index + 1];
  const after = items[index + 2];
  const lastImpressionKey = useRef<string | null>(null);

  useEffect(() => {
    const urls = [current?.primaryPhotoUrl, next?.primaryPhotoUrl, after?.primaryPhotoUrl].filter(Boolean) as string[];
    if (urls.length) void Image.prefetch(urls, 'memory-disk').catch(() => false);
  }, [current?.primaryPhotoUrl, next?.primaryPhotoUrl, after?.primaryPhotoUrl]);

  useEffect(() => {
    onFrontChange?.(current ?? null);
  }, [current, onFrontChange]);

  useEffect(() => {
    if (!current) return;
    const impressionKey = `${index}:${current.id}`;
    if (lastImpressionKey.current === impressionKey) return;
    lastImpressionKey.current = impressionKey;
    void (async () => {
      try {
        const client = await makeClient();
        await client.trackAnalytics([
          {
            event: 'public_profile_impression',
            props: {
              profileId: current.id,
              deckIndex: index,
              surface: 'public_profile_deck',
              sessionId: IMPRESSION_SESSION_ID,
            },
            source: 'consumer',
          },
        ]);
      } catch {
        // Best-effort analytics: browse must never fail because instrumentation failed.
      }
    })();
  }, [current, index, makeClient]);

  if (!current) {
    // No card means nothing to swipe, so the three swipe controls used to sit
    // here disabled and inert — a third of the screen of dead UI. Offer the one
    // action that can actually refill the deck instead.
    return (
      <View style={styles.deckArea}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name={filtered ? 'sliders' : 'compass'} size={26} color={colors.gold} />
            </View>
            <Text style={[type.h2, { textAlign: 'center' }]}>
              {filtered ? 'No matches for these filters' : "You're all caught up"}
            </Text>
            <Text style={[type.bodyMuted, { textAlign: 'center' }]}>
              {filtered
                ? 'Try widening your age, location or gender filters to see more people.'
                : 'You have seen everyone for now. New profiles are added as they clear review.'}
            </Text>
            {emptyAction ? <View style={styles.emptyAction}>{emptyAction}</View> : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.deckArea, isDesktop ? styles.deckAreaDesktop : null]}>
      <View style={styles.deckRow}>
        {/* Behind cards fan right (+22/+44); shift the stack left by half the
            peek so the visual footprint is optically centered (mockup rule). */}
        <View style={[styles.stack, webNoSelect, { transform: [{ translateX: isDesktop ? -22 : -11 }] }]}>
          {after ? (
            <Animated.View style={[styles.absCard, { zIndex: 1 }, behind2Style]} pointerEvents="none">
              <DeckCard profile={after} />
            </Animated.View>
          ) : null}
          {next ? (
            <Animated.View style={[styles.absCard, { zIndex: 2 }, behind1Style]} pointerEvents="none">
              <DeckCard profile={next} preload />
            </Animated.View>
          ) : null}

          <Animated.View
            style={[styles.absCard, styles.frontCard, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
              <Text style={[styles.stampText, styles.stampTextPass]}>PASS</Text>
            </Animated.View>
            <Animated.View style={[styles.stampLike, { opacity: likeOpacity }]}>
              <View style={styles.likeDisc}>
                <Feather name="heart" size={38} color={colors.onPrimary} />
              </View>
              <Text style={styles.likeWord}>LIKE</Text>
            </Animated.View>
            {canSecondLook ? (
              <Animated.View style={[styles.stampBack, { opacity: secondLookOpacity }]} pointerEvents="none">
                <Feather name="rotate-ccw" size={15} color={colors.goldBright} />
                <Text style={styles.stampBackText}>SECOND LOOK</Text>
              </Animated.View>
            ) : null}

            {/* Locked rule: deck click never navigates; only "View full profile"
                opens detail (story panel on desktop, inline pill on mobile). */}
            <View style={styles.cardPressable}>
              <DeckCard
                profile={current}
                front
                saved={saved?.has(current.id)}
                onSave={onSave ? () => onSave(current) : undefined}
                onOpenProfile={!isDesktop ? () => router.push(`/(tabs)/profile?id=${current.id}`) : undefined}
              />
            </View>
          </Animated.View>
        </View>

      </View>

      <View style={styles.actions}>
        <ActionButton variant="pass" label="Pass" onPress={() => forceSwipe('pass')} />
        <ActionButton variant="second" label="Second Look" onPress={secondLook} disabled={!canSecondLook} />
        <ActionButton variant="like" label="Like" onPress={() => forceSwipe('like')} />
      </View>
    </View>
  );
}

function DeckCard({
  profile,
  front,
  preload,
  saved,
  onSave,
  onOpenProfile,
}: {
  profile: PublicProfileSummary;
  front?: boolean;
  preload?: boolean;
  saved?: boolean;
  onSave?: () => void;
  onOpenProfile?: () => void;
}) {
  // Front card needs detail; the next card preloads it so its rows match once
  // it becomes the front card (no content shift on advance).
  const detail = usePublicProfile(front || preload ? profile.id : undefined).data;
  const release = detail?.releaseDate ? formatRelease(detail.releaseDate) : null;
  const bioText = detail?.bio || profile.bioExcerpt || null;
  const interests = detail?.interests?.filter(Boolean).slice(0, 3).join(', ') || null;
  const acceptsMail = detail?.acceptsMail ?? false;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {/* pointerEvents="none" wrapper stops the browser's native image drag
            on web; the swipe pan + tap fall through to the handlers behind it. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ProfilePhoto
            uri={profile.primaryPhotoUrl}
            name={profile.displayName}
            style={styles.image}
            priority={front ? 'high' : preload ? 'normal' : 'low'}
            showCaption={false}
        />
        </View>

        {/* Midnight tint, so the photo set reads as one. The bottom scrim went
            with the overlay it used to carry. */}
        <View style={styles.photoTint} pointerEvents="none" />

        {/* Was shown on whichever card happened to be on top, regardless of
            whether an identity check had ever been done. */}
        {front && profile.isVerified ? (
          <View style={styles.verifiedBadge} pointerEvents="none">
            <Feather name="shield" size={13} color={colors.goldBright} />
            <Text style={styles.verifiedBadgeText}>Verified Profile</Text>
          </View>
        ) : null}

        {front && onSave ? (
          <Pressable
            onPress={onSave}
            hitSlop={8}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.saveBtn,
              webTransition,
              hovered ? styles.saveBtnHover : null,
              pressed ? { transform: [{ scale: 0.88 }] } : null,
            ]}
          >
            <Feather name="heart" size={20} color={saved ? colors.primary : colors.gold} />
          </Pressable>
        ) : null}

      </View>

      {/* Detail card: the words get their own paper rather than sitting over
          the face behind a scrim (client screen 2). */}
      <View style={styles.body} pointerEvents={onOpenProfile ? 'box-none' : 'none'}>
          <View style={styles.nameRow} pointerEvents="none">
            <Text style={styles.name} numberOfLines={1}>
              {profile.displayName}
            </Text>
            {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
            {profile.isVerified ? (
              <Feather name="shield" size={15} color={colors.gold} style={styles.verified} />
            ) : null}
          </View>

          <View style={styles.locationRow}>
            <Feather name="home" size={13} color={colors.textMuted} />
            <Text style={styles.state}>{stateName(profile.facility.state)}</Text>
          </View>

          {interests ? <FactRow icon="heart" label="Interests" value={interests} /> : null}
          {release ? <FactRow icon="calendar" label="Release Date" value={release} /> : null}
          {acceptsMail ? <FactRow icon="mail" label="Accepts Mail" value="Yes" /> : null}

          {bioText ? (
            <View style={styles.quoteRow} pointerEvents="none">
              <Text style={styles.quoteMark}>“</Text>
              <Text style={styles.quoteText} numberOfLines={3}>
                {bioText}
              </Text>
            </View>
          ) : null}

          {onOpenProfile ? (
            <Pressable
              onPress={onOpenProfile}
              hitSlop={6}
              style={({ pressed }: { pressed: boolean }) => [
                styles.viewProfilePill,
                pressed ? { opacity: 0.8 } : null,
              ]}
            >
              <Text style={styles.viewProfileText}>View full profile</Text>
              <Feather name="arrow-right" size={13} color={colors.primary} />
            </Pressable>
          ) : null}
      </View>
    </View>
  );
}

/**
 * One labelled fact on the detail card ("Interests: Fitness, Reading"), as the
 * client screens set them: icon, bold label, then the value.
 */
function FactRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.factRow} pointerEvents="none">
      <Feather name={icon} size={14} color={colors.textMuted} style={styles.factIcon} />
      <Text style={styles.factText} numberOfLines={2}>
        <Text style={styles.factLabel}>{label}: </Text>
        {value}
      </Text>
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
  const isLike = variant === 'like';
  const isSecond = variant === 'second';
  const glyphColor = isLike ? colors.onPrimary : isSecond ? colors.gold : colors.textSecondary;
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => {
        const active = (pressed || hovered) && !disabled;
        return (
          <View style={styles.actionWrap}>
            <View
              style={[
                styles.actionCircle,
                webTransition,
                isLike ? styles.actionCircleLike : null,
                active ? styles.actionCircleActive : null,
                // Micro-interaction: Like circle heartbeats while hovered (web).
                isLike && hovered && !disabled ? styles.actionCircleHeartbeat : null,
                // Second Look gets a pink glow ring when active (screen 5).
                isSecond && active ? styles.actionCircleSecondActive : null,
                pressed && !disabled ? styles.actionCirclePressed : null,
                disabled ? styles.actionDisabled : null,
              ]}
            >
              {variant === 'pass' ? (
                <Feather name="x" size={26} color={glyphColor} />
              ) : isSecond ? (
                <Feather name="rotate-ccw" size={22} color={glyphColor} />
              ) : (
                <Feather name="heart" size={24} color={glyphColor} />
              )}
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.md },
  // Desktop browse has a sibling story column; both columns need to start on
  // the same y-axis and share the same visual column height. Mobile keeps the
  // centered Tinder-card posture above.
  deckAreaDesktop: { justifyContent: 'flex-start', paddingVertical: 0 },
  // maxHeight keeps the action circles tucked under the card instead of
  // pinned to the bottom of a tall desktop column.
  deckRow: { flex: 1, maxHeight: 520, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: spacing.md, width: '100%' },
  // flex:1 fills the available space (so the photo shrinks to fit on short
  // screens - no scroll), but maxHeight caps it on tall desktop viewports so the
  // card stays a sensible size and the footer below stays in view.
  stack: { flex: 1, maxWidth: CARD_MAX_WIDTH, maxHeight: 520, position: 'relative' },
  absCard: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  frontCard: { zIndex: 3 },
  cardPressable: { flex: 1 },
  chevron: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(46, 18, 64, 0.12)',
  },
  chevronActive: { borderColor: colors.primary, transform: [{ scale: 1.06 }] },
  chevronDisabled: { opacity: 0.4 },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    boxShadow: '0 20px 44px rgba(46, 18, 64, 0.18)',
  },
  imageWrap: { flex: 1, position: 'relative', backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { ...type.caption, color: colors.textMuted },
  verifiedBadge: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    boxShadow: '0 2px 8px rgba(22, 5, 31, 0.20)',
  },
  verifiedBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textPrimary },
  photoTint: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.photoTint },
  body: { padding: spacing.lg, gap: 7, backgroundColor: colors.bgCard },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  // Nudged onto the first line rather than centred on a wrapped block.
  factIcon: { marginTop: 2 },
  factText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.textSecondary, flex: 1 },
  factLabel: { fontFamily: fonts.bodySemibold, color: colors.textPrimary },
  quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  quoteMark: { fontFamily: 'BreeSerif_400Regular', fontSize: 22, lineHeight: 24, color: colors.primary },
  quoteText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
    flex: 1,
  },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  saveBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(46, 18, 64, 0.18)',
  },
  saveBtnHover: { backgroundColor: '#FFFFFF', transform: [{ scale: 1.08 }] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: 'BreeSerif_400Regular', fontSize: 24, color: colors.textPrimary, flexShrink: 1 },
  age: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, fontSize: 18 },
  verified: { marginLeft: -2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  state: { ...type.label, color: colors.textMuted, flexShrink: 1 },
  emptyWrap: { flex: 1, width: '100%', maxWidth: CARD_MAX_WIDTH, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.gold,
    marginBottom: spacing.xs,
  },
  emptyAction: { marginTop: spacing.md, alignSelf: 'stretch' },
  emptyCard: {
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 3,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  // Client screen 4 draws Like as a pink disc with the word beneath it, sitting
  // over the middle of the card rather than as a corner badge.
  stampLike: {
    position: 'absolute',
    right: spacing.xl,
    top: '34%',
    zIndex: 5,
    alignItems: 'center',
    gap: spacing.sm,
    transform: [{ rotate: '12deg' }],
  },
  likeDisc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(219,2,82,0.45)',
  },
  likeWord: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    letterSpacing: 3,
    color: colors.onPrimary,
    textShadowColor: 'rgba(22,5,31,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  // Pass keeps the stamped-letter treatment, scaled to read across the card.
  stampPass: {
    left: spacing.xl,
    borderColor: '#FFFFFF',
    borderWidth: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    transform: [{ rotate: '-12deg' }],
  },
  // Centred rather than tilted into a corner: the pull-back is a vertical
  // gesture, so a rotated corner stamp would read as a sideways swipe.
  stampBack: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.goldBright,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(26,8,51,0.55)',
  },
  stampBackText: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1.5, color: colors.goldBright },
  stampText: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: 2 },
  stampTextPass: { color: '#FFFFFF', fontSize: 34 },
  actions: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start', justifyContent: 'center' },
  actionWrap: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(46, 18, 64, 0.12)',
  },
  actionCircleLike: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    boxShadow: '0 10px 24px rgba(219, 2, 82,0.45)',
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(135deg, #F02168, #DB0252 55%, #B80143)' } as object,
    }),
  },
  actionCircleActive: { transform: [{ translateY: -3 }, { scale: 1.05 }] },
  actionCircleHeartbeat: {
    ...Platform.select({
      web: {
        animationKeyframes: [
          {
            '0%': { transform: [{ translateY: -3 }, { scale: 1.06 }] },
            '50%': { transform: [{ translateY: -3 }, { scale: 1.14 }] },
            '100%': { transform: [{ translateY: -3 }, { scale: 1.06 }] },
          },
        ],
        animationDuration: '0.9s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      } as object,
    }),
  },
  actionCircleSecondActive: { borderColor: colors.primary, borderWidth: 2, boxShadow: '0 0 0 6px rgba(219, 2, 82, 0.18)' },
  actionCirclePressed: { transform: [{ scale: 0.94 }] },
  actionDisabled: { opacity: 0.4 },
  actionLabel: { ...type.caption },
  viewProfilePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  viewProfileText: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.primary },
});
