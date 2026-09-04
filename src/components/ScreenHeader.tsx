import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

const webTransition =
  Platform.OS === 'web'
    ? { transitionProperty: 'background-color, transform', transitionDuration: '140ms', transitionTimingFunction: 'ease-out' }
    : null;

/**
 * Header for a pushed screen: a round back control and the title.
 *
 * The back affordance was a text link sitting in the page flow, which reads as
 * a web page. A phone expects a tap target it can reach with a thumb, in the
 * same place on every screen.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.back,
          webTransition,
          hovered ? { backgroundColor: colors.surfaceMuted } : null,
          pressed ? { transform: [{ scale: 0.94 }] } : null,
        ]}
      >
        <Feather name="chevron-left" size={20} color={colors.textPrimary} />
      </Pressable>
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titles: { flex: 1, minWidth: 0 },
  title: { ...type.h2, fontSize: 19, color: colors.textPrimary },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  spacer: { width: 36, height: 36 },
});

/** A tappable settings row with a chevron, for menu-style screens. */
export function SettingsRow({
  label,
  value,
  icon,
  onPress,
  danger,
  last,
}: {
  label: string;
  value?: string | null;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        rowStyles.row,
        !last ? rowStyles.divider : null,
        webTransition,
        hovered && onPress ? { backgroundColor: colors.surfaceMuted } : null,
        pressed && onPress ? { opacity: 0.7 } : null,
      ]}
    >
      {icon ? (
        <View style={rowStyles.iconWrap}>
          <Feather name={icon} size={15} color={danger ? colors.danger : colors.primary} />
        </View>
      ) : null}
      <Text style={[rowStyles.label, danger ? rowStyles.labelDanger : null]} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={rowStyles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Feather name="chevron-right" size={17} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 0,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
  },
  label: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14.5, color: colors.textPrimary },
  labelDanger: { color: colors.danger, fontFamily: 'Inter_600SemiBold' },
  value: { fontFamily: 'Inter_400Regular', fontSize: 13.5, color: colors.textMuted, maxWidth: 150 },
});
