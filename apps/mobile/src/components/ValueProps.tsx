import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, spacing, type } from '../theme';

// Icons cropped from the client's delivered splash screen so they match exactly
// (emblem heart, pink envelope, open book w/ bookmark, heart-in-headphones).
const FEATURE_ICONS = {
  emblem: require('../../assets/logo/heartlink-emblem.png'),
  mail: require('../../assets/icons/secure.png'),
  'book-open': require('../../assets/icons/resources.png'),
  'headphones-heart': require('../../assets/icons/hope.png'),
} as const;

/**
 * The four brand value props that run along the bottom of the marketing-style
 * screens (home footer, resources, support). Copy + icons match the client's
 * delivered design.
 */
type IconKind = 'emblem' | 'mail' | 'book-open' | 'headphones-heart';

// Shared microinteraction recipe — kept identical to Landing.tsx so hover/press
// feel is unified across the marketing surfaces.
const webTransition =
  Platform.OS === 'web'
    ? {
        transitionProperty: 'transform, box-shadow, opacity, background-color, border-color, color',
        transitionDuration: '200ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : null;

// These props are informational, not actionable — hover-polish them, but keep a
// default cursor so they never read as clickable.
const notClickable = Platform.OS === 'web' ? ({ cursor: 'default' } as any) : null;

const ITEMS: { kind: IconKind; title: string; body: string }[] = [
  { kind: 'emblem', title: 'Meaningful Connections', body: 'Find and connect with incredible people.' },
  { kind: 'mail', title: 'Secure Communication', body: 'Our secure inbox keeps your letters private and protected.' },
  { kind: 'book-open', title: 'Support & Resources', body: 'Access tools and support for every step of the journey.' },
  { kind: 'headphones-heart', title: 'Hope for the Future', body: 'Building stronger connections for a better tomorrow.' },
];

function Icon({ kind }: { kind: IconKind }) {
  return <Image source={FEATURE_ICONS[kind]} style={styles.featureIcon} contentFit="contain" />;
}

export function ValueProps() {
  const { width } = useWindowDimensions();
  const stacked = width < 720;

  return (
    <View style={[styles.wrap, stacked ? styles.wrapStacked : styles.wrapRow]}>
      {ITEMS.map((it, i) => (
        <Pressable
          key={it.title}
          accessibilityElementsHidden={false}
          style={({ hovered }: { hovered?: boolean }) => [
            styles.item,
            stacked ? styles.itemStacked : styles.itemRow,
            !stacked && i > 0 ? styles.itemDivider : null,
            webTransition,
            notClickable,
            hovered ? styles.itemHover : null,
          ]}
        >
          <View style={styles.iconCol}>
            <Icon kind={it.kind} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{it.title}</Text>
            <Text style={styles.body}>{it.body}</Text>
          </View>
        </Pressable>
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
  },
  wrapRow: { flexDirection: 'row' },
  wrapStacked: { flexDirection: 'column', gap: spacing.lg },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderRadius: 18, paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, marginHorizontal: -spacing.xs },
  itemRow: { flex: 1 },
  itemStacked: { width: '100%' },
  itemDivider: { borderLeftWidth: 1, borderLeftColor: colors.border, marginLeft: spacing.xl, paddingLeft: spacing.xl },
  // Informational hover: warm the surface, no lift — polish without pretending
  // to be a button.
  itemHover: { backgroundColor: colors.surfaceMuted },
  iconCol: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  featureIcon: { width: 28, height: 24 },
  copy: { flex: 1, gap: 2 },
  title: { ...type.label, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  body: { ...type.caption },
});
