import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ListPublicProfilesQuery, ProfileGender } from '../lib/api';
import { colors, cta, radii, spacing, type, inputReset } from '../theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const webTransition =
  Platform.OS === 'web'
    ? { transitionProperty: 'background-color, border-color, color, transform', transitionDuration: '160ms', transitionTimingFunction: 'ease-out' }
    : null;

const AGE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Open to all' },
  { label: '18–29', min: 18, max: 29 },
  { label: '30–39', min: 30, max: 39 },
  { label: '40–49', min: 40, max: 49 },
  { label: '50+', min: 50 },
];

const GENDERS: { label: string; value: ProfileGender | undefined }[] = [
  { label: 'Everyone', value: undefined },
  { label: 'Men', value: 'male' },
  { label: 'Women', value: 'female' },
];

// Hybrid age control: one-tap presets layered over an editable min/max range,
// both writing the existing continuous ageMin/ageMax query (deviance decision #7).
function parseAge(t: string): number | undefined {
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? undefined : n;
}

function clampAge(n: number): number {
  return Math.min(99, Math.max(18, n));
}

interface FilterSheetProps {
  open: boolean;
  query: ListPublicProfilesQuery;
  onClose: () => void;
  onApply: (next: ListPublicProfilesQuery) => void;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.chip,
        webTransition,
        active ? styles.chipActive : null,
        pressed ? { transform: [{ scale: 0.96 }] } : null,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function FilterSheet({ open, query, onClose, onApply }: FilterSheetProps) {
  const [ageMin, setAgeMin] = useState<number | undefined>(query.ageMin);
  const [ageMax, setAgeMax] = useState<number | undefined>(query.ageMax);
  const [state, setState] = useState(query.state ?? '');
  const [gender, setGender] = useState<ProfileGender | undefined>(query.gender);

  const scale = useRef(new Animated.Value(0.95)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Sync local state from the query each time the sheet opens, and play the entrance.
  useEffect(() => {
    if (!open) return;
    setAgeMin(query.ageMin);
    setAgeMax(query.ageMax);
    setState(query.state ?? '');
    setGender(query.gender);
    scale.setValue(0.95);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function apply() {
    const next: ListPublicProfilesQuery = { limit: query.limit, offset: 0 };
    // Clamp to a sane band and auto-correct an inverted range instead of
    // silently passing min > max to the API.
    let lo = ageMin != null ? clampAge(ageMin) : undefined;
    let hi = ageMax != null ? clampAge(ageMax) : undefined;
    if (lo != null && hi != null && lo > hi) {
      const t = lo;
      lo = hi;
      hi = t;
    }
    if (lo != null) next.ageMin = lo;
    if (hi != null) next.ageMax = hi;
    if (state.trim()) next.state = state.trim().toUpperCase();
    if (gender) next.gender = gender;
    onApply(next);
    onClose();
  }

  function clear() {
    setAgeMin(undefined);
    setAgeMax(undefined);
    setState('');
    setGender(undefined);
    onApply({ limit: query.limit, offset: 0 });
    onClose();
  }

  const ageActive = (p: (typeof AGE_PRESETS)[number]) => p.min === ageMin && p.max === ageMax;
  const ageInvalid = ageMin != null && ageMax != null && ageMin > ageMax;

  // Badoo-pattern applied-filter count on the Apply button.
  const appliedCount =
    (ageMin != null || ageMax != null ? 1 : 0) + (state.trim() ? 1 : 0) + (gender ? 1 : 0);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }], width: '100%', alignItems: 'center' }}>
          <Pressable style={styles.card} onPress={() => undefined}>
            <View style={styles.header}>
              {/* flex:1 so long subtitle copy wraps inside the card instead of
                  overhanging past the close button. */}
              <View style={styles.headerText}>
                <Text style={styles.title}>Filters</Text>
                <Text style={styles.subtitle}>Refine who you discover. Choose Everyone to keep the full deck visible.</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }: { pressed: boolean }) => [styles.closeBtn, pressed ? { opacity: 0.6 } : null]}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.label}>AGE RANGE</Text>
            <View style={styles.chipRow}>
              {AGE_PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  active={ageActive(p)}
                  onPress={() => {
                    setAgeMin(p.min);
                    setAgeMax(p.max);
                  }}
                />
              ))}
            </View>
            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <TextInput
                  style={styles.rangeInput}
                  value={ageMin != null ? String(ageMin) : ''}
                  onChangeText={(t) => setAgeMin(parseAge(t))}
                  keyboardType="number-pad"
                  placeholder="Min"
                  placeholderTextColor={colors.textMuted}
                  maxLength={2}
                />
              </View>
              <Text style={styles.rangeDash}>to</Text>
              <View style={styles.rangeField}>
                <TextInput
                  style={styles.rangeInput}
                  value={ageMax != null ? String(ageMax) : ''}
                  onChangeText={(t) => setAgeMax(parseAge(t))}
                  keyboardType="number-pad"
                  placeholder="Max"
                  placeholderTextColor={colors.textMuted}
                  maxLength={2}
                />
              </View>
            </View>
            {ageInvalid ? (
              <Text style={styles.rangeHint}>Min is above max; we'll swap them.</Text>
            ) : null}

            <Text style={styles.label}>LOCATION</Text>
            <View style={styles.field}>
              <Feather name="map-pin" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="State, e.g. CA"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>

            <Text style={styles.label}>SHOW ME</Text>
            <Text style={styles.sectionHint}>Same gender choices as the quick menu, with age and location in one place.</Text>
            <View style={styles.segment}>
              {GENDERS.map((g) => {
                const active = gender === g.value;
                return (
                  <Pressable
                    key={g.label}
                    onPress={() => setGender(g.value)}
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.segmentItem,
                      webTransition,
                      active ? styles.segmentItemActive : null,
                      pressed ? { opacity: 0.85 } : null,
                    ]}
                  >
                    <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={clear}
                style={({ pressed }: { pressed: boolean }) => [styles.clearBtn, pressed ? { opacity: 0.6 } : null]}
              >
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
              <Pressable
                onPress={apply}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.applyBtn,
                  webTransition,
                  hovered ? { opacity: 0.92 } : null,
                  pressed ? { transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                <Text style={styles.applyText}>{appliedCount > 0 ? `Apply (${appliedCount})` : 'Apply filters'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    boxShadow: '0 24px 60px rgba(26, 8, 51, 0.32)',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...type.h1, fontSize: 24 },
  subtitle: { ...type.bodyMuted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  sectionHint: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDeep,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  chipText: { ...type.button, fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  rangeField: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.bgDeep, paddingHorizontal: spacing.lg },
  rangeInput: { paddingVertical: spacing.md, color: colors.textPrimary, fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  rangeDash: { ...type.caption, color: colors.textMuted },
  rangeHint: { ...type.caption, color: colors.danger, marginTop: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgDeep,
  },
  input: { flex: 1, paddingVertical: spacing.md, color: colors.textPrimary, fontFamily: 'Inter_500Medium', fontSize: 15, letterSpacing: 1 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2, borderRadius: radii.pill },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { ...type.button, fontSize: 14, color: colors.textSecondary },
  segmentTextActive: { color: colors.onPrimary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  clearBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  clearText: { ...type.button, color: colors.textSecondary },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    boxShadow: cta.glow,
    ...Platform.select({
      web: { backgroundImage: cta.gradientCss } as object,
    }),
  },
  applyText: { ...type.button, color: colors.onPrimary, fontSize: 15 },
});
