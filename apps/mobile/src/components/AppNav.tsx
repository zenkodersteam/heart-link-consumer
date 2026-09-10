import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsDark } from './ThemeProvider';
import { haptics } from '../lib/haptics';
import { duration, easing, spring } from '../lib/motion';
import { useApiClientFactory } from '../lib/use-api-client';
import { colors, radii, shell, spacing, themedStyles, type } from '../theme';

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

/**
 * The tab bar, drawn by us and driven by the navigator.
 *
 * `BottomTabBarProps` comes from the tab navigator: it owns which tab is
 * current and what a press does, and this decides only how that looks. The
 * bar used to read the URL and call `replace` itself, so which tab was
 * selected lived in two places and neither was the navigator's.
 */
export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();
  const isDark = useIsDark();
  const padBottom = Math.max(insets.bottom, spacing.sm);

  const tabs = (
    <>
      {TAB_ITEMS.map((item, index) => {
        const route = state.routes[index];
        return (
          <Tab
            key={item.key}
            item={item}
            active={state.index === index}
            badge={item.key === 'mailbox' ? unread : 0}
            onPress={() => {
              // The navigator's own event, so a screen can react to a second
              // tap on the tab it is already showing.
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) return;
              if (state.index === index) return;
              haptics.selection();
              navigation.navigate(route.name);
            }}
          />
        );
      })}
    </>
  );

  // Glass on iOS, where the platform's own bars are translucent and content
  // scrolling under them is what makes an app feel native. Android's bars are
  // opaque, and a blur there reads as a mistake rather than a material.
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={64}
        // The material has to match the ground it is sampling, or the bar reads
        // as a pane of the other theme laid over this one.
        tint={isDark ? 'dark' : 'light'}
        style={[tabStyles.bar, isDark ? tabStyles.barGlassDark : tabStyles.barGlass, { paddingBottom: padBottom }]}
      >
        {tabs}
      </BlurView>
    );
  }

  return <View style={[tabStyles.bar, tabStyles.barSolid, { paddingBottom: padBottom }]}>{tabs}</View>;
}

/**
 * One tab.
 *
 * Its own component so each has its own animation values: five tabs sharing
 * one would mean every press re-running all five.
 *
 * The icon springs up a little on selection and dips on press, and that is the
 * whole of it. A tinted pill behind the active icon was tried and removed: on
 * a bar this quiet, a pink shape appearing under your thumb reads as something
 * having gone wrong rather than as an indicator. The colour change and the
 * weight of the label already say which tab you are on.
 */
function Tab({
  item,
  active,
  badge,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const selected = useSharedValue(active ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    selected.value = reduceMotion
      ? active
        ? 1
        : 0
      : withSpring(active ? 1 : 0, spring.bouncy);
  }, [active, reduceMotion, selected]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + selected.value * 0.08 - pressed.value * 0.06 }],
  }));

  const tint = active ? colors.primary : colors.textMuted;

  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: duration.instant, easing: easing.out });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: duration.base, easing: easing.out });
      }}
      style={tabStyles.tab}
    >
      <Animated.View style={iconStyle}>
        <Feather name={item.icon} size={24} color={tint} />
        {badge > 0 ? (
          <View style={tabStyles.badge}>
            <Text style={tabStyles.badgeText} maxFontSizeMultiplier={1.2}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <Text
        style={[tabStyles.tabLabel, { color: tint }, active ? tabStyles.tabLabelActive : null]}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {item.short}
      </Text>
    </Pressable>
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

const brandStyles = themedStyles((colors) => ({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  heart: { fontFamily: 'BreeSerif_400Regular', color: colors.textPrimary },
  link: { fontFamily: 'BreeSerif_400Regular', color: colors.primary },
}));

const sidebarStyles = themedStyles((colors) => ({
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
  },
  taglineText: {
    fontFamily: 'BreeSerif_400Regular',
    color: colors.gold,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  taglineHeart: { marginTop: 4, opacity: 0.8 },
}));

const tabStyles = themedStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    // Hairline, not 1pt - the system separator is thinner than a point on
    // every retina screen, and a full point reads as a drawn-on rule.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  barSolid: { backgroundColor: colors.bgElevated },
  // The blur needs something behind it or it has nothing to sample; a nearly
  // clear wash keeps the cream family without becoming a solid fill.
  barGlass: { backgroundColor: 'rgba(253,249,246,0.55)' },
  barGlassDark: { backgroundColor: 'rgba(20,7,32,0.55)' },
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
}));

const topStyles = themedStyles((colors) => ({
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
}));
