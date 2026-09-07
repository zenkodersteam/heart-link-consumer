import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, type } from '../theme';
import { BrandDecor } from './BrandDecor';
import { Button } from './primitives';
import { ValueProps } from './ValueProps';

const EMBLEM = require('../../assets/logo/heartlink-emblem.png');

// Single verified face reused across the reconstructed surfaces so the mocks
// read like one real member of the product. The hero browser/phone previews are
// now built from code (below) rather than flat screenshots — the screenshot
// assets remain on disk for supporting use but are no longer the readable UI.
const SHOWCASE_PHOTO = 'https://d8j0ntlcm91z4.cloudfront.net/user_3B8WuBKyaPYHirsbw7INkpxtuLZ/hf_20260721_174052_448e4313-e9fc-4de2-af3d-6a6693025004.png';

const DESKTOP_BREAKPOINT = 900;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// One shared microinteraction recipe for every hover/press surface on the
// marketing screens (mirrored in ValueProps.tsx). One curve, one duration, so
// the whole page reacts to the pointer with a single consistent feel.
const webTransition =
  Platform.OS === 'web'
    ? {
        transitionProperty: 'transform, box-shadow, opacity, background-color, border-color, color, width',
        transitionDuration: '200ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : null;

// Keep informational surfaces from masquerading as buttons on web.
const notClickable = Platform.OS === 'web' ? ({ cursor: 'default' } as const) : null;

function useReduceMotion() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}

/**
 * One-time settle for the above-the-fold hero blocks.
 *
 * Deliberately starts fully opaque. The hero (logo, headline, CTA) is the first
 * paint of the public site, so it must never be gated behind an animation
 * frame — an entrance that fades up from zero left the page reading as a blank
 * blush screen to anything sampling it early. The blocks are legible on frame
 * one and only drift the last few pixels into place.
 */
function useReveal(count: number, reduce: boolean) {
  const values = useRef([...Array(count)].map(() => new Animated.Value(reduce ? 1 : 0))).current;
  useEffect(() => {
    if (reduce) return;
    Animated.stagger(
      90,
      values.map((v) => Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: USE_NATIVE_DRIVER })),
    ).start();
  }, [reduce, values]);
  return (i: number) =>
    reduce
      ? null
      : {
          transform: [{ translateY: values[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        };
}

/**
 * Scroll-driven reveal for below-the-fold sections. Each wrapped block fades and
 * rises as it enters the viewport, and settles once in view — motion tied to the
 * user's scroll rather than a constant loop. Fully static under reduced motion.
 */
function Reveal({
  scrollY,
  reduce,
  viewport,
  style,
  children,
  offsetY,
}: {
  scrollY: Animated.Value;
  reduce: boolean;
  viewport: number;
  style?: object;
  children: ReactNode;
  /**
   * Distance from the top of the scroll content to this block's parent.
   * `onLayout` reports y relative to the parent, so a Reveal that is not a
   * direct child of the ScrollView needs the parent's own offset to place its
   * trigger window correctly.
   */
  offsetY?: number;
}) {
  const [y, setY] = useState<number | null>(null);
  if (reduce || y == null) {
    return (
      <View onLayout={(e) => setY(e.nativeEvent.layout.y)} style={style}>
        {children}
      </View>
    );
  }
  const absoluteY = y + (offsetY ?? 0);
  const start = absoluteY - viewport * 0.92;
  const end = absoluteY - viewport * 0.5;
  const anim = {
    opacity: scrollY.interpolate({ inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: scrollY.interpolate({ inputRange: [start, end], outputRange: [48, 0], extrapolate: 'clamp' }) },
    ],
  };
  return (
    <Animated.View onLayout={(e) => setY(e.nativeEvent.layout.y)} style={[style, anim]}>
      {children}
    </Animated.View>
  );
}

function Wordmark({ size = 30, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <View style={styles.brandWrap}>
      <Image source={EMBLEM} style={{ width: size * 1.18, height: size }} contentFit="contain" />
      <View style={styles.wordmark}>
        <Text style={[styles.wordHeart, { fontSize: size, color: onDark ? colors.sidebarText : colors.textPrimary }]}>
          Heart
        </Text>
        <Text style={[styles.wordLink, { fontSize: size }]}>Link</Text>
      </View>
    </View>
  );
}

export function Landing() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isCompactMobile = !isDesktop && width < 430;
  const reduce = useReduceMotion();
  const reveal = useReveal(4, reduce);

  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: USE_NATIVE_DRIVER,
  });

  const goSignUp = () => router.push('/(auth)/sign-in');
  const goSignIn = () => router.push('/(auth)/sign-in');

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FCF4EF', '#F8E7DF', '#F2DCD2']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BrandDecor />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top navigation */}
        <View style={[styles.nav, isDesktop ? styles.navDesktop : isCompactMobile ? styles.navMobileCompact : styles.navMobile]}>
          <Wordmark size={isDesktop ? 28 : isCompactMobile ? 20 : 24} />
          {isDesktop ? (
            <View style={styles.navActions}>
              <NavLink label="Log In" onPress={goSignIn} />
              <Button label="Create Account" pill style={styles.navCta} onPress={goSignUp} />
            </View>
          ) : null}
        </View>

        <Animated.ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {/* ── Hero: oversized asymmetric, floating message + profile elements ── */}
          <View style={[styles.hero, isDesktop ? styles.heroDesktop : styles.heroMobile]}>
            <Animated.View style={[styles.heroCopy, isDesktop ? styles.heroCopyDesktop : null, reveal(0)]}>
              <View style={styles.eyebrow}>
                <Ionicons name="mail" size={12} color={colors.primary} />
                <Text style={styles.eyebrowText}>Private, supported correspondence</Text>
              </View>
              <Text style={[styles.headline, isDesktop ? styles.headlineDesktop : isCompactMobile ? styles.headlineCompact : null]}>
                Thoughtful connection,{'\n'}
                <Text style={styles.headlineAccent}>beyond every wall.</Text>
              </Text>
              <Text style={[styles.subhead, isDesktop ? styles.subheadDesktop : isCompactMobile ? styles.subheadCompact : null]}>
                HeartLink is a calm, private place to write to people inside. Real letters, honest conversations,
                and trust that builds over time. No swiping, no pressure, support whenever you need it.
              </Text>
              <View style={[styles.heroActions, isDesktop ? styles.heroActionsDesktop : null]}>
                <Button label="Create Account" pill onPress={goSignUp} />
                <Button label="Log In" variant="secondary" pill style={styles.heroLogin} onPress={goSignIn} />
              </View>
              <View style={[styles.trustRow, isDesktop ? styles.trustRowDesktop : styles.trustRowMobile]}>
                <TrustItem icon="shield-checkmark" label="Verified profiles" compact={isCompactMobile} />
                <TrustItem icon="lock-closed" label="Private letters" compact={isCompactMobile} />
                <TrustItem icon="hand-left" label="Safety first" compact={isCompactMobile} />
                <TrustItem icon="heart-circle" label="Real support" compact={isCompactMobile} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.heroStage, isDesktop ? styles.heroStageDesktop : styles.heroStageMobile, reveal(1)]}>
              <HeroComposition scrollY={scrollY} reduce={reduce} desktop={isDesktop} compactMobile={isCompactMobile} />
            </Animated.View>
          </View>

          {/* ── How it works: editorial numbered rows, not centered cards ── */}
          <Reveal scrollY={scrollY} reduce={reduce} viewport={height} style={styles.stepsSection}>
            <View style={[styles.stepsInner, isDesktop ? styles.stepsInnerDesktop : null]}>
              <View style={[styles.stepsHead, isDesktop ? styles.stepsHeadDesktop : null]}>
                <Text style={styles.kicker}>How HeartLink works</Text>
                <Text style={[styles.blockTitle, isDesktop ? styles.blockTitleDesktop : null]}>
                  Three steps to your first letter
                </Text>
                <Text style={styles.blockLede}>
                  No swiping, no games. A clear, supported path from hello to a correspondence that lasts.
                </Text>
              </View>
              <View style={[styles.stepsList, isDesktop ? styles.stepsListDesktop : null]}>
                {STEPS.map((s, i) => (
                  <StepRow
                    key={s.title}
                    index={i + 1}
                    icon={s.icon}
                    title={s.title}
                    body={s.body}
                    last={i === STEPS.length - 1}
                    onPress={goSignUp}
                  />
                ))}
              </View>
            </View>
          </Reveal>

          {/* ── Device showcase: large, cropped, composed product marketing ── */}
          <Reveal scrollY={scrollY} reduce={reduce} viewport={height} style={styles.showcaseSection}>
            <ShowcaseBand scrollY={scrollY} reduce={reduce} desktop={isDesktop} compactMobile={isCompactMobile} />
          </Reveal>

          {/* Brand value props */}
          <Reveal scrollY={scrollY} reduce={reduce} viewport={height} style={styles.valueWrap}>
            <ValueProps />
          </Reveal>

          {/* ── Full-bleed deep-purple trust band, no stat chips ── */}
          <TrustBand scrollY={scrollY} reduce={reduce} viewport={height} desktop={isDesktop} />

          {/* ── Closing CTA: full-bleed deep-purple band ── */}
          <View style={styles.ctaOuter}>
            <LinearGradient
              colors={['#3A164F', '#2E1240', '#241033']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaBand}
            >
              <View style={styles.ctaInner}>
                <View style={styles.ctaEmblem}>
                  <Ionicons name="heart" size={20} color={colors.onPrimary} />
                </View>
                <Text style={[styles.ctaTitle, isDesktop ? styles.ctaTitleDesktop : null]}>
                  Somewhere, someone is waiting to hear from you.
                </Text>
                <Text style={styles.ctaBody}>
                  Creating your account is free and takes about a minute. The first letter is the hardest, and the
                  best.
                </Text>
                <View style={[styles.ctaActions, isDesktop ? styles.ctaActionsDesktop : null]}>
                  <Button label="Create your free account" pill style={styles.ctaButton} onPress={goSignUp} />
                  <Pressable onPress={goSignIn} accessibilityRole="link" style={styles.ctaSignInWrap}>
                    <Text style={styles.ctaSignIn}>Already have an account? Log in</Text>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Wordmark size={22} />
            <Text style={styles.footerTagline}>
              <Text style={styles.tilde}>~ </Text>Love Knows No Bounds<Text style={styles.tilde}> ~</Text>
            </Text>
            <Text style={styles.footerCopy}>
              © {new Date().getFullYear()} HeartLink. Meaningful connections beyond boundaries.
            </Text>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={styles.navLink}>
      {({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => (
        <View style={styles.navLinkInner}>
          <Text style={[styles.navLinkText, webTransition, hovered ? styles.navLinkTextHover : null]}>{label}</Text>
          <View
            style={[styles.navUnderline, webTransition, hovered || pressed ? styles.navUnderlineActive : null]}
          />
        </View>
      )}
    </Pressable>
  );
}

/**
 * First-view trust chip. Rendered as a bordered pill rather than loose text so
 * the four promises read as one deliberate trust bar under the hero CTAs, and
 * stay legible when they wrap on narrow screens.
 */
function TrustItem({
  icon,
  label,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.trustItem, compact ? styles.trustItemCompact : null]}>
      <Ionicons name={icon} size={compact ? 13 : 14} color={colors.gold} />
      <Text style={[styles.trustText, compact ? styles.trustTextCompact : null]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Hero composition: a large, slightly tilted profile device with floating
 * message + verified-profile chips arranged asymmetrically around it. The chips
 * drift on scroll (parallax) rather than looping, so the scene feels alive only
 * while the user moves. Static under reduced motion.
 */
function HeroComposition({
  scrollY,
  reduce,
  desktop,
  compactMobile,
}: {
  scrollY: Animated.Value;
  reduce: boolean;
  desktop: boolean;
  compactMobile: boolean;
}) {
  const parallax = (factor: number) =>
    reduce
      ? null
      : {
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [-200, 0, 600],
                outputRange: [-factor * 0.6, 0, factor],
                extrapolate: 'clamp',
              }),
            },
          ],
        };

  return (
    <View style={[styles.heroComp, desktop ? styles.heroCompDesktop : compactMobile ? styles.heroCompMobileCompact : styles.heroCompMobile]}>
      <View style={[styles.heroGlow, desktop ? styles.heroGlowDesktop : compactMobile ? styles.heroGlowMobileCompact : styles.heroGlowMobile]} pointerEvents="none" />

      {desktop ? (
        <Pressable
          style={({ hovered }: { hovered?: boolean }) => [
            styles.stackDeck,
            webTransition,
            hovered ? styles.stackDeckHover : null,
          ]}
        >
          <StackedProfiles />
        </Pressable>
      ) : null}

      <Pressable
        style={({ hovered }: { hovered?: boolean }) => [
          styles.phone,
          desktop ? styles.phoneDesktop : compactMobile ? styles.phoneMobileCompact : styles.phoneMobile,
          webTransition,
          desktop && hovered ? styles.phoneDesktopHover : null,
        ]}
      >
        <View style={styles.phoneViewport}>
          <PhonePreview />
        </View>
      </Pressable>

      {desktop ? (
        <Animated.View style={[styles.floatChip, styles.floatMessage, parallax(18)]} pointerEvents="none">
          <View style={styles.floatAvatar}>
            <Text style={styles.floatAvatarText}>M</Text>
          </View>
          <View style={styles.floatMessageCopy}>
            <Text style={styles.floatMessageName}>Monique wrote back</Text>
            <Text style={styles.floatMessageText}>"Your letter got here Tuesday. I've read it twice."</Text>
          </View>
        </Animated.View>
      ) : null}

    </View>
  );
}

/**
 * Desktop hero surface: an actual browser window (chrome + address bar) whose
 * content is the in-app profile screen — one verified profile, a short line
 * about who they are, and the two actions that actually matter here: write a
 * letter, or read the full profile first.
 *
 * Deliberately NOT a swipe deck. Peeking rotated cards and a like / pass pair
 * read as a dating app; HeartLink is correspondence, so the product shot leads
 * with writing rather than judging.
 */
function StackedProfiles() {
  return (
    <View style={styles.browserWin}>
      {/* Browser chrome so the surface reads as the live web app. */}
      <View style={styles.browserChrome}>
        <View style={styles.browserDots}>
          <View style={[styles.browserDot, styles.browserDotRose]} />
          <View style={[styles.browserDot, styles.browserDotGold]} />
          <View style={[styles.browserDot, styles.browserDotPurple]} />
        </View>
        <View style={styles.browserAddressBar}>
          <Text style={styles.browserAddressText}>heartlink.app/profiles</Text>
        </View>
        <View style={styles.browserStatusPill}>
          <Ionicons name="mail" size={11} color={colors.primary} />
          <Text style={styles.browserStatusText}>2 letters</Text>
        </View>
      </View>

      {/* In-app profiles surface */}
      <View style={styles.swipeSurface}>
        <View style={styles.swipeTopbar}>
          <View>
            <Text style={styles.swipeHeading}>Profiles</Text>
            <Text style={styles.swipeSub}>Verified, ready for letters</Text>
          </View>
          <View style={styles.browseFilter}>
            <Feather name="sliders" size={13} color={colors.primary} />
            <Text style={styles.browseFilterText}>Filters</Text>
          </View>
        </View>

        <View style={styles.deckStage}>
          <View style={[styles.deckCard, styles.deckCardFront]}>
            <Image source={{ uri: SHOWCASE_PHOTO }} style={styles.stackPhoto} contentFit="cover" cachePolicy="memory-disk" priority="high" />
            <View style={styles.stackVerified}>
              <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
              <Text style={styles.stackVerifiedText}>Verified Profile</Text>
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(26, 8, 51, 0.12)', 'rgba(26, 8, 51, 0.85)']}
              style={styles.stackScrim}
            />
            <View style={styles.stackCaption}>
              <View style={styles.stackNameRow}>
                <Text style={styles.stackName}>Darnell, 34</Text>
              </View>
              <View style={styles.stackLocRow}>
                <Feather name="map-pin" size={12} color={colors.sidebarTextMuted} />
                <Text style={styles.stackLoc}>Texas · Guitar, writing, faith</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Correspondence actions: writing leads, reading the profile supports. */}
        <View style={styles.deckControls}>
          <View style={styles.deckActionPrimary}>
            <Ionicons name="mail" size={16} color={colors.onPrimary} />
            <Text style={styles.deckActionPrimaryText}>Write a letter</Text>
          </View>
          <View style={styles.deckActionSecondary}>
            <Feather name="book-open" size={15} color={colors.primary} />
            <Text style={styles.deckActionSecondaryText}>Read profile</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Reconstructed phone profile preview: the real profile-card experience (photo,
 * verified badge, name, one-line detail) rendered in code so it stays crisp and
 * legible at hero scale. Mirrors the desktop surface: one profile, and writing
 * as the primary action.
 */
function PhonePreview() {
  return (
    <View style={styles.phoneScreen}>
      <View style={styles.phoneNotch} pointerEvents="none" />
      {/* App header so the phone reads as the in-app Profiles screen. */}
      <View style={styles.phoneHeader}>
        <Text style={styles.phoneHeaderTitle}>Profiles</Text>
        <View style={styles.phoneHeaderFilter}>
          <Feather name="sliders" size={13} color={colors.primary} />
        </View>
      </View>

      <View style={styles.phoneDeck}>
        <View style={[styles.phoneDeckCard, styles.phoneDeckFront]}>
          <Image source={{ uri: SHOWCASE_PHOTO }} style={styles.phonePhoto} contentFit="cover" cachePolicy="memory-disk" priority="high" />
          <View style={styles.phoneVerified}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
            <Text style={styles.phoneVerifiedText}>Verified</Text>
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(26, 8, 51, 0.15)', 'rgba(26, 8, 51, 0.82)']}
            style={styles.phoneScrim}
          />
          <View style={styles.phoneCaption}>
            <Text style={styles.phoneName}>Darnell, 34</Text>
            <Text style={styles.phoneBio}>Texas · Guitar, writing, faith</Text>
          </View>
        </View>
      </View>

      <View style={styles.phoneControls}>
        <View style={styles.phoneActionPrimary}>
          <Ionicons name="mail" size={14} color={colors.onPrimary} />
          <Text style={styles.phoneActionPrimaryText}>Write a letter</Text>
        </View>
        <Text style={styles.phoneActionSecondaryText}>Read full profile</Text>
      </View>
    </View>
  );
}

const STEPS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  { icon: 'user-plus', title: 'Create your account', body: 'Sign up free and tell us a little about who you are hoping to write to.' },
  { icon: 'book-open', title: 'Read verified profiles', body: 'Take your time with real people, in their own words, at your own pace.' },
  { icon: 'edit-3', title: 'Write your first letter', body: 'Send it through our secure mailroom and build trust one letter at a time.' },
];

function StepRow({
  index,
  icon,
  title,
  body,
  last,
  onPress,
}: {
  index: number;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Go to create your account"
      style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
        styles.stepRow,
        !last ? styles.stepRowDivider : null,
        webTransition,
        hovered ? styles.stepRowHover : null,
        pressed ? styles.stepRowPressed : null,
      ]}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <>
          <Text style={styles.stepNumeral}>{String(index).padStart(2, '0')}</Text>
          <View style={[styles.stepRowIcon, webTransition, hovered ? styles.stepRowIconHover : null]}>
            <Feather name={icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.stepRowCopy}>
            <Text style={styles.stepRowTitle}>{title}</Text>
            <Text style={styles.stepRowBody}>{body}</Text>
          </View>
          <View style={[styles.stepRowGo, webTransition, hovered ? styles.stepRowGoHover : null]}>
            <Feather name="arrow-right" size={18} color={colors.primary} />
          </View>
        </>
      )}
    </Pressable>
  );
}

/**
 * Device showcase band: an oversized, cropped conversation mock composed against
 * a warm panel with editorial copy — a premium product-marketing section rather
 * than a centered card. The device drifts slightly on scroll (parallax only).
 */
function ShowcaseBand({
  scrollY,
  reduce,
  desktop,
  compactMobile,
}: {
  scrollY: Animated.Value;
  reduce: boolean;
  desktop: boolean;
  compactMobile: boolean;
}) {
  const drift = reduce
    ? null
    : {
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [0, 1200],
              outputRange: [30, -30],
              extrapolate: 'clamp',
            }),
          },
        ],
      };

  return (
    <View style={[styles.showcase, desktop ? styles.showcaseDesktop : compactMobile ? styles.showcaseMobileCompact : styles.showcaseMobile]}>
      <View style={[styles.showcaseCopy, desktop ? styles.showcaseCopyDesktop : null]}>
        <Text style={styles.kicker}>The letter experience</Text>
        <Text style={[styles.blockTitle, desktop ? styles.blockTitleDesktop : null]}>
          Conversations that take their time.
        </Text>
        <Text style={styles.blockLede}>
          {desktop
            ? 'A calm, secure inbox built for words that matter. No pressure and no read-receipt anxiety, just a place to be thoughtful with someone who is being thoughtful back, with resources close by whenever you need a little help finding the right next step.'
            : 'A calm, secure inbox for thoughtful letters, honest replies, and support when you need it.'}
        </Text>
        {desktop ? (
          <View style={styles.showcasePointsDesktop}>
            <ShowcasePoint icon="lock-closed" text="Private, secure correspondence" />
            <ShowcasePoint icon="time" text="Reply on your own time" />
            <ShowcasePoint icon="sparkles" text="Writing prompts for when words are hard" />
          </View>
        ) : null}
      </View>

      <View style={[styles.showcaseStage, desktop ? styles.showcaseStageDesktop : styles.showcaseStageMobile]}>
        <Pressable>
          {({ hovered }: { hovered?: boolean }) => (
            <Animated.View
              style={[
                styles.chatCard,
                desktop ? styles.chatCardDesktop : styles.chatCardMobile,
                webTransition,
                drift,
                desktop && hovered ? styles.chatCardDesktopHover : null,
              ]}
            >
          <View style={styles.chatHeader}>
            <Image source={{ uri: SHOWCASE_PHOTO }} style={styles.chatAvatar} contentFit="cover" cachePolicy="memory-disk" priority="normal" />
            <View style={styles.chatHeaderCopy}>
              <View style={styles.chatHeaderName}>
                <Text style={styles.chatName}>Darnell, 34</Text>
                <Ionicons name="shield-checkmark" size={13} color={colors.gold} />
              </View>
              <Text style={styles.chatStatus}>3-page letter received this week</Text>
            </View>
          </View>
          <View style={styles.chatBody}>
            <Pressable>
              {({ hovered: letterHovered }: { hovered?: boolean }) => (
                <View style={[styles.letterCard, styles.letterCardReceived, letterHovered ? styles.letterCardHover : null]}>
                  <Text style={styles.letterLabel}>From Monique</Text>
                  <Text style={styles.letterTextReceived}>
                    Your last letter about missing your son's first varsity game hit me hard. The part where you said you still picture him checking the stands felt so specific and real, like I was right there with you reading every line slowly.
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable>
              {({ hovered: letterHovered }: { hovered?: boolean }) => (
                <View style={[styles.letterCard, styles.letterCardSent, letterHovered ? styles.letterCardSentHover : null]}>
                  <Text style={styles.letterLabelSent}>Darnell wrote back</Text>
                  <Text style={styles.letterTextSent}>
                    I hated writing that part because it makes the distance feel heavier, but that's the truth of this place. I don't want my letters to you to sound polished if life in here isn't. I want you to know what these days actually feel like and what I'm still trying to hold on to.
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable>
              {({ hovered: letterHovered }: { hovered?: boolean }) => (
                <View style={[styles.letterCard, styles.letterCardReceived, letterHovered ? styles.letterCardHover : null]}>
                  <Text style={styles.letterLabel}>Monique replied</Text>
                  <Text style={styles.letterTextReceived}>
                    Keep telling me the truth then. Tell me what your mornings are like now, what you're reading in the library, what you miss most about home, and what you want your son to know when he opens the next letter from you.
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
          <View style={styles.chatFooter}>
            <View style={styles.chatFooterBadge}>
              <Ionicons name="mail" size={14} color={colors.primary} />
              <Text style={styles.chatFooterBadgeText}>Letter queued through HeartLink mailroom</Text>
            </View>
            <Text style={styles.chatFooterNote}>Inmates exchange letters through the mail system, not live messages.</Text>
          </View>
            </Animated.View>
          )}
        </Pressable>
      </View>

      {!desktop ? (
        <View style={[styles.showcasePoints, styles.showcasePointsMobile]}>
          <ShowcasePoint icon="lock-closed" text="Private, secure letters" />
          <ShowcasePoint icon="time" text="Reply on your own time" />
          <ShowcasePoint icon="sparkles" text="Prompts to break the ice" />
          <ShowcasePoint icon="book-outline" text="A dedicated resources section when you need guidance, ideas, or support" />
        </View>
      ) : null}
    </View>
  );
}

function ShowcasePoint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <Pressable>
      {({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => (
        <View style={[styles.showcasePoint, hovered ? styles.showcasePointHover : null, pressed ? styles.showcasePointPressed : null]}>
          <View style={[styles.showcasePointIcon, hovered ? styles.showcasePointIconHover : null]}>
            <Ionicons name={icon} size={16} color={colors.primary} />
          </View>
          <Text style={styles.showcasePointText}>{text}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} style={[styles.showcasePointArrow, hovered ? styles.showcasePointArrowHover : null]} />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Full-bleed deep-purple trust band. Editorial headline on the left, three
 * safety pillars stacked on the right — no stat chips. Spans the full page
 * width as a dark anchor.
 */
const SAFETY_POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'shield-checkmark',
    title: 'Built for real connection',
    body: 'Thoughtful profiles, clear expectations, and a calmer way to meet someone meaningful.',
  },
  {
    icon: 'lock-closed',
    title: 'Private by design',
    body: 'Your letters live in a secure inbox. You choose what you share, and with whom.',
  },
  {
    icon: 'heart-circle',
    title: 'Support at every step',
    body: 'A real team and real resources are here whenever you need a hand.',
  },
];

function TrustBand({
  scrollY,
  reduce,
  viewport,
  desktop,
}: {
  scrollY: Animated.Value;
  reduce: boolean;
  viewport: number;
  desktop: boolean;
}) {
  const [bandY, setBandY] = useState(0);
  return (
    <View style={styles.trustBleed} onLayout={(e) => setBandY(e.nativeEvent.layout.y)}>
      <LinearGradient
        colors={['#2E1240', '#2A1140', '#3A1A52']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Reveal scrollY={scrollY} reduce={reduce} viewport={viewport} offsetY={bandY} style={styles.trustContent}>
        <View style={[styles.trustGrid, desktop ? styles.trustGridDesktop : null]}>
          <View style={[styles.trustCopy, desktop ? styles.trustCopyDesktop : null]}>
            <View style={styles.trustEyebrow}>
              <Ionicons name="shield-checkmark" size={12} color={colors.gold} />
              <Text style={styles.trustEyebrowText}>Trust & safety</Text>
            </View>
            <Text style={[styles.trustTitle, desktop ? styles.trustTitleDesktop : null]}>
              Safety is the foundation of every connection.
            </Text>
            <Text style={styles.trustLede}>
              We built HeartLink to make sincere connection feel calmer, clearer, and more intentional.
            </Text>
          </View>
          <View style={styles.trustPoints}>
            {SAFETY_POINTS.map((p, i) => (
              <Pressable
                key={p.title}
                style={({ hovered }: { hovered?: boolean }) => [styles.trustPoint, i === 0 ? null : styles.trustPointDivider, webTransition, hovered ? styles.trustPointHover : null]}
              >
                <View style={styles.trustPointIcon}>
                  <Ionicons name={p.icon} size={18} color={colors.gold} />
                </View>
                <View style={styles.trustPointCopy}>
                  <Text style={styles.trustPointTitle}>{p.title}</Text>
                  <Text style={styles.trustPointBody}>{p.body}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Reveal>
    </View>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is HeartLink free to join?',
    a: 'Yes. Creating your account and browsing verified profiles is free. It takes about a minute to get started.',
  },
  {
    q: 'How are profiles verified?',
    a: 'Every member is reviewed by a real person before they can connect, so you are always talking to genuine people.',
  },
  {
    q: 'Is my information private?',
    a: 'Your letters live in a secure inbox and you control what you share. We never sell your data or expose your details.',
  },
  {
    q: 'How do I start a conversation?',
    a: 'Once your account is set up, browse profiles and send a letter to anyone you would like to connect with.',
  },
];

function FaqRow({ q, a, defaultOpen, reduce }: { q: string; a: string; defaultOpen?: boolean; reduce: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const spin = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      spin.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(spin, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [open, reduce, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((v) => !v)}
      style={({ hovered }: { hovered?: boolean }) => [styles.faqRow, webTransition, hovered ? styles.faqRowHover : null]}
    >
      <View style={styles.faqQRow}>
        <Text style={styles.faqQ}>{q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={20} color={colors.primary} />
        </Animated.View>
      </View>
      {open ? <Text style={styles.faqA}>{a}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  safe: { flex: 1 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navDesktop: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg },
  navMobile: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navMobileCompact: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navActionsMobile: { gap: spacing.sm, flexShrink: 1 },
  navCta: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  navCtaMobile: { paddingVertical: 10, paddingHorizontal: spacing.md },
  navLink: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  navLinkInner: { alignItems: 'center', gap: 4 },
  navLinkText: { ...type.button, color: colors.textPrimary },
  navLinkTextHover: { color: colors.primary },
  navUnderline: { height: 2, width: 0, borderRadius: radii.pill, backgroundColor: colors.gold },
  navUnderlineActive: { width: '100%' },

  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  wordHeart: { fontFamily: 'BreeSerif_400Regular', color: colors.textPrimary },
  wordLink: { fontFamily: 'BreeSerif_400Regular', color: colors.primary },

  scroll: { paddingBottom: 0 },

  // ── Hero ──
  hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  heroDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl * 1.25,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl * 1.45,
    paddingBottom: spacing.xxl * 1.6,
  },
  heroMobile: { alignItems: 'center' },
  heroCopy: { gap: spacing.lg, alignItems: 'center', maxWidth: 480 },
  heroCopyDesktop: { flex: 0.9, alignItems: 'flex-start', maxWidth: 560 },

  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryFaint,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  eyebrowText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.4, color: colors.primary },

  headline: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 40,
    lineHeight: 46,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headlineDesktop: { fontSize: 72, lineHeight: 76, textAlign: 'left', letterSpacing: -0.5 },
  headlineCompact: { fontSize: 32, lineHeight: 38 },
  headlineAccent: { color: colors.primary },
  subhead: { ...type.bodyMuted, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 460 },
  subheadDesktop: { textAlign: 'left', fontSize: 18, lineHeight: 28, maxWidth: 520 },
  subheadCompact: { fontSize: 15, lineHeight: 22 },

  heroActions: { width: '100%', maxWidth: 380, gap: spacing.md },
  heroActionsDesktop: { flexDirection: 'row', maxWidth: 460 },
  heroLogin: { borderColor: colors.gold, backgroundColor: colors.bgElevated },

  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xs,
    width: '100%',
  },
  trustRowDesktop: { justifyContent: 'flex-start', maxWidth: 520 },
  trustRowMobile: { maxWidth: 380, gap: spacing.xs },
  // Two per row on a phone. Left to their natural widths they stacked into four
  // ragged centered rows that ate most of the first screen.
  trustItemCompact: { flexGrow: 1, flexBasis: '46%', paddingHorizontal: spacing.sm },
  trustTextCompact: { fontSize: 12 },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  trustText: { ...type.caption, fontSize: 12.5, color: colors.textPrimary, fontFamily: 'Inter_500Medium' },

  heroStage: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl, width: '100%' },
  heroStageDesktop: { flex: 1.2, marginTop: 0, alignItems: 'flex-end' },
  heroStageMobile: { marginTop: spacing.xl, alignItems: 'center' },

  heroComp: { width: 340, height: 620, alignItems: 'center', justifyContent: 'center' },
  heroCompDesktop: { width: 720, height: 560, alignItems: 'flex-end', justifyContent: 'center' },
  heroCompMobile: { width: 320, height: 520 },
  heroCompMobileCompact: { width: 292, height: 480 },
  heroGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryFaint,
    top: 90,
  },
  heroGlowDesktop: { width: 520, height: 360, top: 118, right: 120 },
  heroGlowMobile: { width: 260, height: 260, top: 72 },
  heroGlowMobileCompact: { width: 220, height: 220, top: 64 },

  browser: {
    width: 320,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(107, 63, 160, 0.10)',
    overflow: 'hidden',
    boxShadow: '0 32px 72px rgba(46, 18, 64, 0.16)',
  },
  browserDesktop: { width: 610, alignSelf: 'flex-end' },
  browserDesktopHover: { transform: [{ translateY: -6 }, { scale: 1.01 }], boxShadow: '0 42px 92px rgba(46, 18, 64, 0.20)' },
  browserChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 63, 160, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  browserDots: { flexDirection: 'row', gap: 6 },
  browserDot: { width: 8, height: 8, borderRadius: radii.pill },
  browserDotRose: { backgroundColor: '#F2A3BC' },
  browserDotGold: { backgroundColor: '#E7C483' },
  browserDotPurple: { backgroundColor: '#B396F3' },
  browserAddressBar: {
    flex: 1,
    backgroundColor: 'rgba(107, 63, 160, 0.06)',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  browserAddressText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted },
  browserStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFaint,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  browserStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.primary },
  browserScreenshot: { width: '100%', aspectRatio: 1000 / 920, display: 'flex' },

  // ── Desktop stacked profile-photo composition ──
  stackDeck: { width: 520, height: 520, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center' },
  stackDeckHover: { transform: [{ translateY: -6 }] },
  stackInner: { width: 320, height: 420, position: 'relative' },
  stackLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 288,
    height: 384,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  stackLayerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stackInitial: { fontFamily: 'BreeSerif_400Regular', fontSize: 72, color: 'rgba(255,255,255,0.85)' },
  stackLayerBack2: {
    transform: [{ rotate: '8deg' }, { translateX: 40 }, { translateY: -24 }, { scale: 0.92 }],
    opacity: 0.7,
    zIndex: 1,
    boxShadow: '0 18px 44px rgba(46, 18, 64, 0.16)',
  },
  stackLayerBack1: {
    transform: [{ rotate: '4deg' }, { translateX: 20 }, { translateY: -12 }, { scale: 0.96 }],
    opacity: 0.9,
    zIndex: 2,
    boxShadow: '0 22px 52px rgba(46, 18, 64, 0.18)',
  },
  stackLayerFront: {
    zIndex: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    boxShadow: '0 34px 80px rgba(46, 18, 64, 0.24)',
  },
  stackPhoto: { ...StyleSheet.absoluteFillObject },
  stackVerified: {
    position: 'absolute',
    top: 16,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    zIndex: 2,
  },
  stackVerifiedText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.primary },
  stackScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%' },
  stackCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, gap: 3 },
  stackNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stackName: { fontFamily: 'BreeSerif_400Regular', fontSize: 24, color: colors.sidebarText },
  stackLocRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stackLoc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.sidebarTextMuted },
  stackControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },

  // ── Desktop browser window wrapping the in-app swipe deck ──
  browserWin: {
    width: 470,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(107, 63, 160, 0.10)',
    overflow: 'hidden',
    boxShadow: '0 34px 80px rgba(46, 18, 64, 0.22)',
  },
  swipeSurface: { padding: spacing.lg, gap: spacing.md, backgroundColor: '#FBF1EB' },
  swipeTopbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swipeHeading: { fontFamily: 'BreeSerif_400Regular', fontSize: 20, color: colors.textPrimary },
  swipeSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 },
  deckStage: { height: 320, alignItems: 'center', justifyContent: 'flex-end' },
  deckCard: {
    position: 'absolute',
    width: 250,
    height: 300,
    left: '50%',
    marginLeft: -125,
    bottom: 0,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  deckCardFront: {
    zIndex: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    boxShadow: '0 28px 64px rgba(46, 18, 64, 0.22)',
  },
  deckControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  deckActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 11,
    paddingHorizontal: spacing.xl,
    boxShadow: '0 10px 24px rgba(233, 30, 115, 0.32)',
  },
  deckActionPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onPrimary },
  deckActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
  },
  deckActionSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary },

  // ── Reconstructed browse surface (inside desktop browser frame) ──
  browseSurface: { flexDirection: 'row', backgroundColor: '#FBF1EB', minHeight: 360 },
  browseRail: {
    width: 56,
    backgroundColor: colors.sidebar,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  browseRailEmblem: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  browseRailDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.20)' },
  browseRailDotActive: { width: 8, height: 22, backgroundColor: colors.gold },
  browseMain: { flex: 1, padding: spacing.lg, gap: spacing.md },
  browseTopbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  browseHeading: { fontFamily: 'BreeSerif_400Regular', fontSize: 20, color: colors.textPrimary },
  browseSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 },
  browseFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  browseFilterText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primary },
  browseGrid: { flexDirection: 'row', gap: spacing.md },
  miniCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    boxShadow: '0 12px 26px rgba(46, 18, 64, 0.10)',
  },
  miniPhotoWrap: { position: 'relative', aspectRatio: 4 / 5, backgroundColor: colors.surfaceMuted },
  miniPhoto: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  miniInitial: { fontFamily: 'BreeSerif_400Regular', fontSize: 44, color: 'rgba(255,255,255,0.85)' },
  miniVerified: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  miniVerifiedText: { fontFamily: 'Inter_600SemiBold', fontSize: 9.5, color: colors.textPrimary },
  miniBody: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 3 },
  miniNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniName: { fontFamily: 'BreeSerif_400Regular', fontSize: 15, color: colors.textPrimary, flexShrink: 1 },
  miniAge: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.gold },
  miniLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniLoc: { fontFamily: 'Inter_400Regular', fontSize: 11.5, color: colors.textSecondary },

  // Reconstructed phone Discover screen (in-frame swipe deck)
  phoneScreen: { width: '100%', height: '100%', backgroundColor: '#FBF1EB', paddingTop: 34, paddingHorizontal: 14, paddingBottom: 16, gap: 10 },
  phoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneHeaderTitle: { fontFamily: 'BreeSerif_400Regular', fontSize: 18, color: colors.textPrimary },
  phoneHeaderFilter: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneDeck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phoneDeckCard: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  phoneDeckFront: {
    zIndex: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    boxShadow: '0 22px 52px rgba(46, 18, 64, 0.22)',
  },
  browserBody: { padding: spacing.lg, gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.84)' },
  browserHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  browserTitle: { fontFamily: 'BreeSerif_400Regular', fontSize: 26, color: colors.textPrimary },
  browserSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: colors.textSecondary, maxWidth: 280 },
  browserHeaderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  browserHeaderChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primary },
  browserPanels: { flexDirection: 'row', gap: spacing.md },
  browserPanelLeft: { flex: 1.2, gap: spacing.sm },
  browserPanelRight: { flex: 0.95, gap: spacing.sm },
  browserSectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  browserLetterCard: {
    backgroundColor: '#FFF9F6',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(107, 63, 160, 0.10)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  browserLetterCardMuted: { backgroundColor: colors.bgElevated },
  browserLetterSender: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary },
  browserLetterPreview: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  browserLetterPreviewMuted: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.textMuted },
  browserLetterMeta: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.primary },
  browserStatsCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  browserStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  browserStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary },
  browserStatValue: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.textPrimary },
  browserPromptCard: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  browserPromptTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primary },
  browserPromptBody: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.textPrimary },

  // Phone mock
  phone: {
    position: 'absolute',
    left: 18,
    bottom: 44,
    width: 206,
    aspectRatio: 430 / 932,
    borderRadius: 34,
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
    boxShadow: '0 28px 64px rgba(46, 18, 64, 0.16)',
    transform: [{ rotate: '-1deg' }],
  },
  phoneDesktop: { width: 214, left: 28, bottom: 26 },
  phoneDesktopHover: { transform: [{ rotate: '-1deg' }, { translateY: -8 }, { translateX: 4 }, { scale: 1.02 }], boxShadow: '0 34px 78px rgba(46, 18, 64, 0.20)' },
  phoneMobile: { position: 'relative', left: 'auto', bottom: 'auto', width: 248, transform: [{ rotate: '0deg' }] },
  phoneMobileCompact: { position: 'relative', left: 'auto', bottom: 'auto', width: 224, transform: [{ rotate: '0deg' }] },
  phoneViewport: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  phoneImageOnly: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    display: 'flex',
  },
  phoneNotch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 90,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: '#0F0616',
    zIndex: 2,
  },
  phonePhoto: { ...StyleSheet.absoluteFillObject },
  phoneScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  phoneVerified: {
    position: 'absolute',
    top: 18,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    zIndex: 2,
  },
  phoneVerifiedText: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, color: colors.primary },
  phoneCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, gap: 2 },
  phoneName: { fontFamily: 'BreeSerif_400Regular', fontSize: 22, color: colors.sidebarText },
  phoneBio: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: colors.sidebarTextMuted },
  // Writing is the phone's primary action, with reading the profile as the calm
  // secondary. No like / pass pair: this is correspondence, not a swipe deck.
  phoneControls: { alignItems: 'stretch', gap: 6 },
  phoneActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 10,
    boxShadow: '0 8px 20px rgba(233, 30, 115, 0.30)',
  },
  phoneActionPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.onPrimary },
  phoneActionSecondaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Floating chips
  floatChip: {
    position: 'absolute',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 16px 36px rgba(46, 18, 64, 0.16)',
  },
  floatMessage: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    width: 220,
    right: 12,
    bottom: 32,
  },
  floatAvatar: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatAvatarText: { fontFamily: 'BreeSerif_400Regular', fontSize: 15, color: colors.primary },
  floatMessageCopy: { flex: 1, gap: 2 },
  floatMessageName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textPrimary },
  floatMessageText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, color: colors.textSecondary },

  floatVerified: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    top: 132,
    left: -4,
  },
  floatVerifiedIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatVerifiedTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textPrimary },
  floatVerifiedSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted },


  // ── How it works (editorial rows) ──
  stepsSection: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 1.4,
  },
  stepsInner: { gap: spacing.xxl },
  stepsInnerDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl * 2 },
  stepsHead: { gap: spacing.sm },
  stepsHeadDesktop: { flex: 1, maxWidth: 380 },
  stepsList: { flex: 1.4 },
  stepsListDesktop: { flex: 1.4 },

  kicker: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  blockTitle: { fontFamily: 'BreeSerif_400Regular', fontSize: 30, lineHeight: 36, color: colors.textPrimary },
  blockTitleDesktop: { fontSize: 40, lineHeight: 46, letterSpacing: -0.3 },
  blockLede: { ...type.bodyMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, maxWidth: 420 },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: spacing.xl, borderRadius: radii.lg, paddingHorizontal: spacing.sm, marginHorizontal: -spacing.sm },
  stepRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  stepRowHover: { backgroundColor: colors.bgElevated, boxShadow: '0 18px 44px rgba(46, 18, 64, 0.10)', transform: [{ translateY: -2 }] },
  // Press settles the row back down and eases the shadow — a deliberate "tap"
  // that reads as a real control before it routes to sign-up.
  stepRowPressed: { backgroundColor: colors.surfaceMuted, boxShadow: '0 6px 16px rgba(46, 18, 64, 0.10)', transform: [{ translateY: 0 }] },
  stepRowIconHover: { transform: [{ scale: 1.06 }], boxShadow: '0 8px 18px rgba(233, 30, 115, 0.18)' },
  stepRowGo: { alignSelf: 'center', opacity: 0, transform: [{ translateX: -6 }] },
  stepRowGoHover: { opacity: 1, transform: [{ translateX: 0 }] },
  stepNumeral: { fontFamily: 'BreeSerif_400Regular', fontSize: 26, color: colors.gold, width: 42 },
  stepRowIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRowCopy: { flex: 1, gap: spacing.xs, paddingTop: 2 },
  stepRowTitle: { fontFamily: 'BreeSerif_400Regular', fontSize: 21, color: colors.textPrimary },
  stepRowBody: { ...type.bodyMuted, fontSize: 15, lineHeight: 22 },

  // ── Device showcase ──
  showcaseSection: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: spacing.md },
  showcase: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.xl,
    gap: spacing.lg,
    boxShadow: '0 30px 80px rgba(46, 18, 64, 0.12)',
  },
  showcaseDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl, padding: spacing.xxl * 1.2 },
  showcaseMobile: { padding: spacing.lg, gap: spacing.lg },
  showcaseMobileCompact: { padding: spacing.md, gap: spacing.md },
  showcaseCopy: { gap: spacing.md },
  showcaseCopyDesktop: { flex: 0.95, maxWidth: 420 },
  showcasePoints: { gap: spacing.md, marginTop: spacing.md },
  showcasePointsDesktop: { gap: spacing.sm, marginTop: spacing.lg },
  showcasePointsMobile: { marginTop: spacing.lg },
  showcasePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  showcasePointHover: { backgroundColor: colors.bgCard, boxShadow: '0 16px 34px rgba(46, 18, 64, 0.10)', transform: [{ translateX: 3 }, { translateY: -1 }] },
  showcasePointPressed: { transform: [{ translateX: 1 }, { translateY: 0 }], boxShadow: '0 8px 18px rgba(46, 18, 64, 0.08)' },
  showcasePointIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
  },
  showcasePointIconHover: { transform: [{ scale: 1.06 }], boxShadow: '0 10px 20px rgba(233, 30, 115, 0.16)' },
  showcasePointText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textSecondary, flex: 1 },
  showcasePointArrow: { opacity: 0, transform: [{ translateX: -6 }] },
  showcasePointArrowHover: { opacity: 1, transform: [{ translateX: 0 }] },

  showcaseStage: { alignItems: 'center', justifyContent: 'flex-start' },
  showcaseStageDesktop: { flex: 1.1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.xs, alignItems: 'flex-end', justifyContent: 'flex-start' },
  showcaseStageMobile: { width: '100%', alignItems: 'stretch', justifyContent: 'flex-start', marginTop: spacing.lg },
  chatCard: {
    width: 328,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    boxShadow: '0 24px 60px rgba(46, 18, 64, 0.20)',
  },
  chatCardDesktop: { width: 500, transform: [{ rotate: '0deg' }] },
  // Shadow-only lift so the hover composes with the scroll-driven `drift`
  // transform instead of overriding it (both would otherwise set `transform`).
  chatCardDesktopHover: { boxShadow: '0 34px 82px rgba(46, 18, 64, 0.22)' },
  chatCardMobile: { width: '100%', maxWidth: 340, alignSelf: 'center', padding: spacing.md, gap: spacing.sm },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chatAvatar: { width: 44, height: 44, borderRadius: radii.pill },
  chatHeaderCopy: { gap: 2 },
  chatHeaderName: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chatName: { fontFamily: 'BreeSerif_400Regular', fontSize: 17, color: colors.textPrimary },
  chatStatus: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.primary, lineHeight: 16 },
  chatBody: { gap: spacing.sm, paddingVertical: spacing.sm },
  letterCard: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  letterCardReceived: { alignSelf: 'stretch', backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  letterCardSent: { alignSelf: 'stretch', backgroundColor: colors.primary, borderColor: colors.primary },
  letterCardHover: { transform: [{ translateY: -2 }, { translateX: 2 }], boxShadow: '0 12px 24px rgba(46, 18, 64, 0.08)' },
  letterCardSentHover: { transform: [{ translateY: -2 }, { translateX: 2 }], boxShadow: '0 16px 26px rgba(233, 30, 115, 0.16)' },
  letterLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11.5, color: colors.primary, marginBottom: spacing.xs },
  letterLabelSent: { fontFamily: 'Inter_600SemiBold', fontSize: 11.5, color: colors.onPrimary, marginBottom: spacing.xs },
  letterTextReceived: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.textPrimary },
  letterTextSent: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.onPrimary },
  chatFooter: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  chatFooterBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chatFooterBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.textPrimary },
  chatFooterNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, color: colors.textMuted },

  valueWrap: { width: '100%', maxWidth: 1120, alignSelf: 'center', borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.xxl },

  // ── Full-bleed trust band ──
  trustBleed: { width: '100%', marginTop: spacing.xxl * 1.6, overflow: 'hidden' },
  trustContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 1.8,
  },
  trustGrid: { gap: spacing.xxl },
  trustGridDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl * 2 },
  trustCopy: { gap: spacing.md },
  trustCopyDesktop: { flex: 1, maxWidth: 420 },
  trustEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.sidebarElevated,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  trustEyebrowText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  trustTitle: { fontFamily: 'BreeSerif_400Regular', fontSize: 30, lineHeight: 36, color: colors.sidebarText },
  trustTitleDesktop: { fontSize: 40, lineHeight: 46, letterSpacing: -0.3 },
  trustLede: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, color: colors.sidebarTextMuted, maxWidth: 380 },
  trustPoints: { flex: 1 },
  trustPoint: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start', paddingVertical: spacing.xl, borderRadius: radii.lg, paddingHorizontal: spacing.sm, marginHorizontal: -spacing.sm },
  trustPointDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' },
  trustPointHover: { backgroundColor: 'rgba(255,255,255,0.04)', transform: [{ translateY: -2 }] },
  trustPointIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.sidebarElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustPointCopy: { flex: 1, gap: 4 },
  trustPointTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.sidebarText },
  trustPointBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: colors.sidebarTextMuted },

  // ── Editorial statement ──
  statementSection: { width: '100%', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl * 2 },
  statementInner: { maxWidth: 860, alignSelf: 'center', alignItems: 'center', gap: spacing.lg },
  statementMark: { opacity: 0.9 },
  statementText: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 28,
    lineHeight: 38,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statementTextDesktop: { fontSize: 40, lineHeight: 54 },
  statementAccent: { color: colors.primary },
  statementAttr: { fontFamily: 'Inter_500Medium', fontSize: 14, letterSpacing: 0.4, color: colors.textSecondary },

  // ── FAQ (divider treatment) ──
  faqSection: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 1.5 },
  faqInner: { gap: spacing.xl },
  faqInnerDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl * 2 },
  faqHead: { gap: spacing.xs },
  faqHeadDesktop: { flex: 1, maxWidth: 320 },
  faqList: { flex: 1.6, borderTopWidth: 1, borderTopColor: colors.border },
  faqListDesktop: { flex: 1.6 },
  faqRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.lg, gap: spacing.sm },
  faqRowHover: { backgroundColor: 'rgba(233, 30, 115, 0.03)' },
  faqQRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  faqQ: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.textPrimary, flex: 1 },
  faqA: { ...type.bodyMuted, fontSize: 15, lineHeight: 23, maxWidth: 620 },

  // ── Closing CTA (full-bleed) ──
  ctaOuter: { width: '100%', overflow: 'hidden' },
  ctaBand: { width: '100%', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl * 2 },
  ctaInner: { maxWidth: 620, alignSelf: 'center', alignItems: 'center', gap: spacing.md },
  ctaEmblem: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    boxShadow: '0 12px 30px rgba(233, 30, 115, 0.45)',
  },
  ctaTitle: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 30,
    lineHeight: 38,
    color: colors.sidebarText,
    textAlign: 'center',
  },
  ctaTitleDesktop: { fontSize: 44, lineHeight: 52, letterSpacing: -0.3 },
  ctaBody: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, color: colors.sidebarTextMuted, textAlign: 'center', maxWidth: 460 },
  ctaActions: { alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  ctaActionsDesktop: {},
  ctaButton: { paddingHorizontal: spacing.xxl },
  ctaSignInWrap: { marginTop: spacing.xs },
  ctaSignIn: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.gold },

  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerTagline: { fontFamily: 'BreeSerif_400Regular', fontSize: 14, color: colors.textPrimary },
  tilde: { color: colors.gold },
  footerCopy: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
