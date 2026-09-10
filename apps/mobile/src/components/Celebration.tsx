import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '../lib/haptics';
import { duration, easing, spring } from '../lib/motion';
import { colors, themedStyles } from '../theme';

/**
 * The moment something is finished.
 *
 * Used once, deliberately: at the end of onboarding, which is the only screen
 * in the app where somebody has just completed a piece of work rather than
 * simply moved through it. Spending this anywhere else would spend it here too.
 *
 * A ring opens outward, hearts scatter along fixed bearings, and the mark
 * springs in behind them - all on the UI thread, so the success haptic and the
 * first frame land together instead of drifting apart while JavaScript
 * finishes the submit that triggered them.
 */

/** Bearing, distance and size per heart. Fixed, not random: a scatter that
 *  changes every time reads as a glitch rather than a flourish. */
const HEARTS = [
  { angle: -90, distance: 96, size: 16, delay: 0 },
  { angle: -35, distance: 78, size: 12, delay: 40 },
  { angle: 25, distance: 88, size: 14, delay: 20 },
  { angle: 90, distance: 70, size: 11, delay: 60 },
  { angle: 145, distance: 84, size: 13, delay: 30 },
  { angle: -145, distance: 74, size: 12, delay: 50 },
] as const;

export function Celebration({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const burst = useSharedValue(0);
  const mark = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    haptics.success();
    if (reduceMotion) return;
    mark.value = withDelay(60, withSpring(1, spring.bouncy));
    burst.value = withTiming(1, { duration: 900, easing: easing.out });
  }, [burst, mark, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: burst.value < 0.5 ? burst.value * 1.2 : Math.max(0, 1 - (burst.value - 0.5) * 2),
    transform: [{ scale: 0.4 + burst.value * 1.6 }],
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mark.value }],
    opacity: mark.value,
  }));

  return (
    <View style={styles.stage} pointerEvents="box-none">
      {!reduceMotion ? (
        <>
          <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
          {HEARTS.map((h) => (
            <Heart key={h.angle} progress={burst} {...h} />
          ))}
        </>
      ) : null}
      <Animated.View style={markStyle}>{children}</Animated.View>
    </View>
  );
}

function Heart({
  progress,
  angle,
  distance,
  size,
  delay,
}: {
  progress: Animated.SharedValue<number>;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}) {
  const radians = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    // Each heart starts a little after the last, so the burst has a front
    // rather than all six leaving at once.
    const t = Math.max(0, Math.min(1, (progress.value - delay / 900) / (1 - delay / 900)));
    return {
      opacity: t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85),
      transform: [
        { translateX: Math.cos(radians) * distance * t },
        { translateY: Math.sin(radians) * distance * t - t * 14 },
        { scale: 0.4 + t * 0.8 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.heart, style]} pointerEvents="none">
      <Feather name="heart" size={size} color={colors.primary} />
    </Animated.View>
  );
}

const styles = themedStyles((colors) => ({
  stage: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primaryFaint,
  },
  heart: { position: 'absolute' },
}));

/** Re-exported so callers can time a follow-on against the burst. */
export const CELEBRATION_MS = duration.enter * 3;
