import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

/**
 * The four brand value props that run along the bottom of the marketing-style
 * screens (splash, home, resources). Mailbox/messaging copy is deliberately
 * avoided here since in-app messaging is out of MVP scope.
 */
const ITEMS = [
  { title: 'Meaningful Connections', body: 'Find and connect with incredible people.' },
  { title: 'Verified Profiles', body: 'Every profile is reviewed for authenticity and safety.' },
  { title: 'Support & Resources', body: 'Tools and support for every step of the journey.' },
  { title: 'Hope for the Future', body: 'Building stronger connections for a better tomorrow.' },
] as const;

export function ValueProps() {
  const { width } = useWindowDimensions();
  const stacked = width < 720;

  return (
    <View style={[styles.wrap, stacked ? styles.wrapStacked : styles.wrapRow]}>
      {ITEMS.map((it) => (
        <View key={it.title} style={[styles.item, stacked ? styles.itemStacked : styles.itemRow]}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <Text style={styles.title}>{it.title}</Text>
            <Text style={styles.body}>{it.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  wrapRow: { flexDirection: 'row' },
  wrapStacked: { flexDirection: 'column' },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  itemRow: { flex: 1 },
  itemStacked: { width: '100%' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  copy: { flex: 1, gap: 2 },
  title: { ...type.label, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  body: { ...type.caption },
});
