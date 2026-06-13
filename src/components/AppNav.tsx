import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

/**
 * Navigation model for the consumer app shell. Mailbox is intentionally absent
 * (in-app messaging is out of MVP scope — see docs/ai/decisions.md). Each item
 * maps a display label to its expo-router path; `match` is the resolved
 * pathname used to compute the active state (the (tabs) group is transparent in
 * the URL, so the Home route is just "/").
 */
export interface NavItem {
  key: string;
  label: string;
  path: string;
  match: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'index', label: 'Home', path: '/', match: '/' },
  { key: 'liked', label: 'Liked', path: '/liked', match: '/liked' },
  { key: 'resources', label: 'Resources', path: '/resources', match: '/resources' },
  { key: 'support', label: 'Support', path: '/support', match: '/support' },
  { key: 'account', label: 'Account', path: '/account', match: '/account' },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === '/') return pathname === '/' || pathname === '/index';
  return pathname.startsWith(item.match);
}

function Wordmark({ onDark }: { onDark?: boolean }) {
  return (
    <View style={navStyles.wordmark}>
      <Text style={[navStyles.wordHeart, onDark ? { color: colors.sidebarText } : null]}>Heart</Text>
      <Text style={navStyles.wordLink}>Link</Text>
    </View>
  );
}

/** Deep-purple left rail shown on wide (desktop) layouts. */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={sidebarStyles.rail}>
      <View style={sidebarStyles.brand}>
        <Wordmark onDark />
      </View>

      <View style={sidebarStyles.items}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.path as never)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                sidebarStyles.item,
                active ? sidebarStyles.itemActive : null,
                hovered && !active ? sidebarStyles.itemHover : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <Text style={[sidebarStyles.itemLabel, active ? sidebarStyles.itemLabelActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={sidebarStyles.tagline}>
        <Text style={sidebarStyles.taglineText}>Love Knows{'\n'}No Bounds</Text>
      </View>
    </View>
  );
}

/** White bottom tab bar shown on narrow (mobile) layouts. */
export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={tabStyles.bar}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.path as never)}
            style={({ pressed }: { pressed: boolean }) => [tabStyles.tab, pressed ? { opacity: 0.6 } : null]}
          >
            <View style={[tabStyles.indicator, active ? tabStyles.indicatorActive : null]} />
            <Text style={[tabStyles.tabLabel, active ? tabStyles.tabLabelActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact top bar (wordmark) for mobile layouts. */
export function MobileTopBar({ right }: { right?: React.ReactNode }) {
  return (
    <View style={topStyles.bar}>
      <Wordmark />
      <View style={topStyles.right}>{right}</View>
    </View>
  );
}

const navStyles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  wordHeart: { fontFamily: 'BreeSerif_400Regular', fontSize: 22, color: colors.textPrimary },
  wordLink: { fontFamily: 'BreeSerif_400Regular', fontSize: 22, color: colors.primary },
});

const sidebarStyles = StyleSheet.create({
  rail: {
    width: 232,
    backgroundColor: colors.sidebar,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  brand: { paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  items: { gap: spacing.xs },
  item: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  itemActive: { backgroundColor: colors.sidebarElevated },
  itemHover: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  itemLabel: { ...type.button, color: colors.sidebarTextMuted, fontSize: 15 },
  itemLabelActive: { color: colors.sidebarText },
  tagline: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: colors.goldFaint,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  taglineText: {
    fontFamily: 'BreeSerif_400Regular',
    color: colors.gold,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.xs },
  indicator: { width: 18, height: 3, borderRadius: radii.pill, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.primary },
  tabLabel: { ...type.caption, fontSize: 11 },
  tabLabelActive: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
});

const topStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
