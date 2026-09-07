import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApiClientFactory } from '../lib/use-api-client';
import { colors, radii, shell, spacing, type } from '../theme';

const EMBLEM = require('../../assets/logo/heartlink-emblem.png');

/**
 * Navigation model for the consumer app shell. Mailbox is shown to match the
 * client's delivered design; in-app messaging is out of MVP scope, so the route
 * is a "coming soon" placeholder for now (see docs/ai/decisions.md).
 */
export interface NavItem {
  key: string;
  label: string;
  short: string;
  path: string;
  match: string;
  icon: keyof typeof Feather.glyphMap;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'index', label: 'Home', short: 'Home', path: '/', match: '/', icon: 'home' },
  { key: 'mailbox', label: 'Mailbox', short: 'Mailbox', path: '/mailbox', match: '/mailbox', icon: 'mail' },
  { key: 'liked', label: 'Liked', short: 'Liked', path: '/liked', match: '/liked', icon: 'heart' },
  { key: 'circle', label: 'Support Circle', short: 'Circle', path: '/circle', match: '/circle', icon: 'edit-3' },
  { key: 'resources', label: 'Resources', short: 'Resources', path: '/resources', match: '/resources', icon: 'book-open' },
  { key: 'support', label: 'Support', short: 'Support', path: '/support', match: '/support', icon: 'headphones' },
  { key: 'account', label: 'Account', short: 'Account', path: '/account', match: '/account', icon: 'user' },
];

// Mobile tabs (UI lift): Support and Support Circle stay off the bottom bar so
// it keeps its approved five-item density. Both are reachable from Account.
const TAB_ITEMS = NAV_ITEMS.filter((i) => i.key !== 'support' && i.key !== 'circle');

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === '/') return pathname === '/' || pathname === '/index';
  return pathname.startsWith(item.match);
}

function Brand({ size = 22, onDark }: { size?: number; onDark?: boolean }) {
  return (
    <View style={brandStyles.wrap}>
      <Image source={EMBLEM} style={{ width: size * 1.18, height: size, marginRight: 8 }} contentFit="contain" />
      <View style={brandStyles.wordmark}>
        <Text style={[brandStyles.heart, { fontSize: size }, onDark ? { color: colors.sidebarText } : null]}>Heart</Text>
        <Text style={[brandStyles.link, { fontSize: size }]}>Link</Text>
      </View>
    </View>
  );
}

/** Total unread letters for the Mailbox nav badge; 0 (hidden) when unavailable. */
function useUnreadCount(): number {
  const factory = useApiClientFactory();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const client = await factory();
        const res = await client.listMailboxThreads();
        if (active) setCount(res.items.reduce((n, t) => n + t.unreadCount, 0));
      } catch {
        // Badge simply hides when the mailbox can't be reached.
      }
    })();
    return () => {
      active = false;
    };
  }, [factory]);
  return count;
}

/** Midnight-gradient left rail (UI lift mockup): brand, pink-pill nav, gold tagline. */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const unread = useUnreadCount();

  return (
    <LinearGradient
      colors={[...shell.railGradient]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={sidebarStyles.rail}
    >
      <View style={sidebarStyles.brand}>
        <Image source={EMBLEM} style={sidebarStyles.emblem} contentFit="contain" />
        <View style={brandStyles.wordmark}>
          <Text style={[brandStyles.heart, sidebarStyles.brandWord]}>Heart</Text>
          <Text style={[brandStyles.link, { fontSize: 21 }]}>Link</Text>
        </View>
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
                hovered && !active ? sidebarStyles.itemHover : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              {active ? (
                <LinearGradient
                  colors={[...shell.navActiveGradient]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              {active ? <View style={sidebarStyles.itemEdge} /> : null}
              <Feather
                name={item.icon}
                size={19}
                color={active ? shell.navActiveIcon : colors.sidebarTextMuted}
              />
              <Text style={[sidebarStyles.itemLabel, active ? sidebarStyles.itemLabelActive : null]}>{item.label}</Text>
              {item.key === 'mailbox' && unread > 0 ? (
                <View style={sidebarStyles.badge}>
                  <Text style={sidebarStyles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={sidebarStyles.tagline}>
        <View style={sidebarStyles.taglineRule} />
        <Text style={sidebarStyles.taglineText}>Love Knows{'\n'}No Bounds</Text>
        <Feather name="heart" size={11} color={colors.gold} style={sidebarStyles.taglineHeart} />
      </View>

      <View style={sidebarStyles.railEdge} />
    </LinearGradient>
  );
}

/**
 * Bottom tab bar for narrow (mobile) layouts, built to iOS conventions.
 *
 * This is a hand-rolled bar rather than a real `<Tabs>` navigator, because the
 * shell is shared with the desktop web build. Three things were making it read
 * as a web nav pasted onto a phone:
 *
 * - The bar stopped above the home indicator, with page background showing
 *   below it. A native tab bar runs to the bottom of the screen and carries the
 *   safe-area inset as its own padding, so its surface sits under the
 *   indicator. The layout hands us the bottom edge to do that.
 * - The active tab was a filled pink pill, which is Material's navigation bar.
 *   iOS marks the active tab with tint alone.
 * - The top border was a full point; iOS uses a hairline, which is thinner than
 *   1pt on every retina screen.
 *
 * Tapping a tab also used to `push`, so the history grew without bound - five
 * taps meant five stacked screens, all still mounted. Tabs switch rather than
 * stack, so this navigates in place.
 */
export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();

  return (
    <View style={[tabStyles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TAB_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const tint = active ? colors.primary : colors.textMuted;
        const showBadge = item.key === 'mailbox' && unread > 0;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            onPress={() => {
              if (active) return;
              router.replace(item.path as never);
            }}
            style={({ pressed }: { pressed: boolean }) => [tabStyles.tab, pressed ? { opacity: 0.4 } : null]}
          >
            <View>
              <Feather name={item.icon} size={24} color={tint} />
              {showBadge ? (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[tabStyles.tabLabel, { color: tint }, active ? tabStyles.tabLabelActive : null]}>
              {item.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact top bar (brand + optional right slot) for mobile layouts. */
export function MobileTopBar({ right }: { right?: ReactNode }) {
  return (
    <View style={topStyles.bar}>
      <Brand size={20} />
      <View style={topStyles.right}>{right}</View>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  heart: { fontFamily: 'BreeSerif_400Regular', color: colors.textPrimary },
  link: { fontFamily: 'BreeSerif_400Regular', color: colors.primary },
});

const sidebarStyles = StyleSheet.create({
  rail: {
    width: shell.railWidth,
    paddingTop: 22,
    paddingBottom: 20,
    paddingHorizontal: 14,
  },
  railEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    backgroundColor: shell.goldHairline,
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage: `linear-gradient(180deg, ${shell.goldHairline}, ${shell.goldHairlineFaint})`,
      } as object,
    }),
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.xl,
  },
  emblem: {
    width: 32,
    height: 27,
    ...Platform.select({
      web: { filter: `drop-shadow(0 4px 10px ${shell.emblemGlow})` } as object,
    }),
  },
  brandWord: { fontSize: 21, color: colors.sidebarText },
  items: { flex: 1, gap: 3 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  itemEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary },
  badge: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.onPrimary },
  itemHover: { backgroundColor: shell.navHover },
  itemLabel: { ...type.button, color: colors.sidebarTextMuted, fontSize: 14.5 },
  itemLabelActive: { color: '#FFFFFF' },
  tagline: { alignItems: 'center', paddingTop: 18, paddingBottom: 6, paddingHorizontal: 10 },
  taglineRule: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: shell.taglineRule,
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage: `linear-gradient(90deg, transparent, ${shell.taglineRule}, transparent)`,
      } as object,
    }),
  },
  taglineText: {
    fontFamily: 'BreeSerif_400Regular',
    color: colors.gold,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    ...Platform.select({
      web: {
        backgroundImage: shell.goldTextGradientCss,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      } as object,
    }),
  },
  taglineHeart: { marginTop: 4, opacity: 0.8 },
});

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bgElevated,
    // Hairline, not 1pt - the system separator is thinner than a point on
    // every retina screen, and a full point reads as a drawn-on rule.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  // 49pt of touch target above the safe-area inset, matching UITabBar.
  tab: { flex: 1, height: 49, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { ...type.caption, fontSize: 10, lineHeight: 13 },
  tabLabelActive: { fontFamily: 'Inter_600SemiBold' },
  badge: {
    position: 'absolute',
    top: -4,
    left: 14,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: colors.onPrimary },
});

const topStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
