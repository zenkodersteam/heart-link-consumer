import { Feather, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProfileGender } from '@heartlink/consumer-api';
import { colors, radii, spacing, themedStyles, type } from '../theme';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// undefined = no gender filter, shown as "Both" — the wording the client screens
// use and the one ADR-006 records ("Men / Women / Both per the client screens").
// FilterSheet uses the same three labels so the two filter surfaces agree.
const OPTIONS: { label: string; value: ProfileGender | undefined; icon: keyof typeof Feather.glyphMap }[] = [
  { label: 'Men', value: 'male', icon: 'user' },
  { label: 'Women', value: 'female', icon: 'user' },
  { label: 'Both', value: undefined, icon: 'users' },
];

interface GenderMenuProps {
  open: boolean;
  value: ProfileGender | undefined;
  anchor: AnchorRect | null;
  /** Wide (desktop) renders an anchored dropdown; narrow renders a bottom sheet. */
  desktop: boolean;
  onClose: () => void;
  onSelect: (value: ProfileGender | undefined) => void;
}

export function GenderMenu({ open, value, anchor, desktop, onClose, onSelect }: GenderMenuProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 9, tension: 90, useNativeDriver: true }).start();
  }, [open, anim]);

  const sameSelection = (a: ProfileGender | undefined, b: ProfileGender | undefined) => a === b;

  const Options = (
    <>
      {OPTIONS.map((o) => {
        const active = sameSelection(value, o.value);
        return (
          <Pressable
            key={o.label}
            onPress={() => {
              onSelect(o.value);
              onClose();
            }}
            style={({ pressed }: { pressed: boolean }) => [
              styles.option,
              active ? styles.optionActive : null,
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <Feather name={o.icon} size={18} color={active ? colors.onPrimary : colors.textSecondary} />
            <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{o.label}</Text>
            {active ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} style={styles.check} /> : null}
          </Pressable>
        );
      })}
    </>
  );

  if (desktop) {
    // Anchored dropdown under the Gender chip.
    const top = anchor ? anchor.y + anchor.height + 8 : 120;
    const left = anchor ? anchor.x : spacing.xl;
    return (
      <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
        <Pressable style={styles.backdropClear} onPress={onClose}>
          <Animated.View
            style={[
              styles.dropdown,
              { top, left, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] },
            ]}
          >
            <Pressable onPress={() => undefined}>
              <Text style={styles.title}>Gender</Text>
              <Text style={styles.subtitle}>Select who you'd like to connect with</Text>
              <View style={styles.optionList}>{Options}</View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }

  // Mobile bottom sheet.
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdropDim} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] },
          ]}
        >
          <Pressable onPress={() => undefined}>
            <View style={styles.handle} />
            <Text style={styles.title}>Filter by Gender</Text>
            <Text style={styles.subtitle}>Select who you'd like to connect with</Text>
            <View style={styles.optionList}>{Options}</View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Read per call so it follows the theme, not the import order. */
function cardBase() {
  return {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    boxShadow: '0 24px 60px rgba(26, 8, 51, 0.28)',
  } as const;
}

const styles = themedStyles((colors) => ({
  backdropClear: { flex: 1 },
  backdropDim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  dropdown: { position: 'absolute', width: 280, ...cardBase() },
  sheet: { ...cardBase(), borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: spacing.xxl },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radii.pill, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  title: { ...type.h2, fontSize: 18 },
  subtitle: { ...type.caption, marginTop: 2, marginBottom: spacing.md },
  optionList: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  optionActive: { backgroundColor: colors.sidebar, borderColor: colors.sidebar },
  optionText: { ...type.button, fontSize: 15, color: colors.textPrimary, flex: 1 },
  optionTextActive: { color: colors.onPrimary },
  check: { marginLeft: 'auto' },
}));
