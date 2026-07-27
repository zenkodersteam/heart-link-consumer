import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

/**
 * Soft animated background layer for the marketing-style surfaces (welcome
 * splash, Home): faint hearts that slowly drift + rotate, and gold stars that
 * twinkle + pulse, so the backdrop feels alive rather than flat. Absolutely
 * filled, non-interactive, and respects reduced motion.
 */

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function useReduceMotion() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}

type HeartCfg = { size: number; op: number; pos: object; d: number; ay: number; ax: number; r: number; dir: 1 | -1 };

// d = which drift driver (0–3) the heart rides; dir flips direction so hearts
// sharing a driver don't move in lockstep.
const HEARTS: HeartCfg[] = [
  { size: 18, op: 0.1, pos: { top: '9%', left: '12%' }, d: 0, ay: 11, ax: 4, r: 3, dir: 1 },
  { size: 11, op: 0.08, pos: { top: '6%', left: '45%' }, d: 1, ay: 8, ax: 3, r: 2, dir: -1 },
  { size: 13, op: 0.09, pos: { top: '15%', right: '13%' }, d: 2, ay: 13, ax: 5, r: 4, dir: 1 },
  { size: 9, op: 0.08, pos: { top: '29%', left: '8%' }, d: 3, ay: 9, ax: 3, r: 3, dir: -1 },
  { size: 15, op: 0.07, pos: { top: '41%', right: '8%' }, d: 0, ay: 14, ax: 5, r: 3, dir: -1 },
  { size: 10, op: 0.07, pos: { top: '55%', left: '13%' }, d: 1, ay: 9, ax: 4, r: 2, dir: 1 },
  { size: 11, op: 0.06, pos: { top: '47%', left: '47%' }, d: 2, ay: 11, ax: 4, r: 3, dir: -1 },
  { size: 12, op: 0.08, pos: { bottom: '24%', right: '11%' }, d: 3, ay: 10, ax: 5, r: 4, dir: 1 },
  { size: 16, op: 0.07, pos: { bottom: '13%', left: '17%' }, d: 0, ay: 12, ax: 5, r: 3, dir: 1 },
  { size: 9, op: 0.08, pos: { bottom: '8%', right: '21%' }, d: 1, ay: 8, ax: 3, r: 2, dir: -1 },
  { size: 13, op: 0.07, pos: { bottom: '6%', left: '44%' }, d: 2, ay: 11, ax: 4, r: 3, dir: 1 },
];

type SparkCfg = { size: number; pos: object; t: 0 | 1; base: number };

const SPARKS: SparkCfg[] = [
  { size: 14, pos: { top: '12%', right: '26%' }, t: 0, base: 0.6 },
  { size: 11, pos: { top: '34%', left: '20%' }, t: 1, base: 0.5 },
  { size: 10, pos: { top: '52%', right: '19%' }, t: 0, base: 0.45 },
  { size: 12, pos: { bottom: '33%', left: '24%' }, t: 1, base: 0.5 },
  { size: 13, pos: { bottom: '19%', right: '27%' }, t: 0, base: 0.55 },
];

const DRIFT_DURATIONS = [3800, 4600, 5400, 6200];

export function BrandDecor() {
  const reduce = useReduceMotion();

  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;
  const drivers = useMemo(() => [d0, d1, d2, d3], [d0, d1, d2, d3]);

  const tA = useRef(new Animated.Value(0.5)).current;
  const tB = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (reduce) return;
    const drift = drivers.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: DRIFT_DURATIONS[i], easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(v, { toValue: 0, duration: DRIFT_DURATIONS[i], easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      ),
    );
    const twinkle = (v: Animated.Value, up: number, dn: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: up, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(v, { toValue: 0.3, duration: dn, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      );
    const loops = [...drift, twinkle(tA, 1500, 1500), twinkle(tB, 2100, 1800)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduce, drivers, tA, tB]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {HEARTS.map((h, i) => {
        const drv = drivers[h.d];
        const transform = reduce
          ? undefined
          : [
              { translateY: drv.interpolate({ inputRange: [0, 1], outputRange: [-h.ay * h.dir, h.ay * h.dir] }) },
              { translateX: drv.interpolate({ inputRange: [0, 1], outputRange: [h.ax * h.dir, -h.ax * h.dir] }) },
              { rotate: drv.interpolate({ inputRange: [0, 1], outputRange: [`${-h.r * h.dir}deg`, `${h.r * h.dir}deg`] }) },
            ];
        return (
          <Animated.View key={`h${i}`} style={[styles.decor, h.pos, transform ? { transform } : null]}>
            <Ionicons name="heart" size={h.size} color={`rgba(233,30,115,${h.op})`} />
          </Animated.View>
        );
      })}

      {SPARKS.map((s, i) => {
        const tv = s.t === 0 ? tA : tB;
        const opacity = reduce ? 0.5 : tv;
        const transform = reduce ? undefined : [{ scale: tv.interpolate({ inputRange: [0.3, 1], outputRange: [0.82, 1.18] }) }];
        return (
          <Animated.View key={`s${i}`} style={[styles.decor, s.pos, { opacity }, transform ? { transform } : null]}>
            <Ionicons name="sparkles" size={s.size} color={`rgba(201,145,46,${s.base})`} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  decor: { position: 'absolute' },
});
