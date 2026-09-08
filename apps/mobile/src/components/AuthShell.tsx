import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BRAND_PROMISES,
  BRAND_SUBTITLE,
  BRAND_TAGLINE,
  type BrandPromiseIcon,
} from '@heartlink/consumer-content';

import { BrandDecor } from './BrandDecor';
import { auth, colors, fonts, radii, spacing, type } from '../theme';

const EMBLEM = require('../../assets/logo/heartlink-emblem.png');

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function useReduceMotion() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Shrink the mobile art panel for form-heavy screens.
   *
   * The full-height panel is a landing flourish; on a nine-step onboarding it
   * costs a third of the phone screen and pushes the fields into a cramped
   * strip. Long forms opt out.
   */
  compact?: boolean;
  /**
   * Render immediately, with no entrance animation.
   *
   * The fade-and-rise suits a page you land on once. Across nine onboarding
   * steps it replays on every shell remount and just makes the form look like
   * it is arriving late.
   */
  staticEntrance?: boolean;
  /**
   * Rendered with the title, above the scroll area, so it stays put.
   *
   * Onboarding puts its progress bar here: title, subtitle and progress used to
   * scroll away with the answers, leaving you part way down a step with no way
   * to see which question you were answering.
   */
  stickyHeader?: ReactNode;
  /**
   * Drop the artwork on phones entirely and show a slim brand bar instead.
   *
   * For the nine sign-up questions: even the compact panel reserved about a
   * fifth of the screen on every step, so the questions themselves were squeezed
   * into what was left. The art belongs on a screen someone sees once, not on
   * nine in a row.
   */
  minimal?: boolean;
}

function Brand({ size }: { size: number }) {
  return (
    <View style={styles.brandWrap}>
      <Image source={EMBLEM} style={{ width: size * 1.18, height: size }} contentFit="contain" />
      <View style={styles.wordmark}>
        <Text style={[styles.wordHeart, { fontSize: size }]}>Heart</Text>
        <Text style={[styles.wordLink, { fontSize: size }]}>Link</Text>
      </View>
    </View>
  );
}

/** Serif statement over the bridge art: tagline line renders in gold. */

/** Midnight art panel: bridge artwork, veil, brand, statement, trust proofs. */
/**
 * Brand panel, following screen 10 of the client designs: emblem, wordmark,
 * tagline and the four promises on warm blush.
 *
 * This used to be the midnight bridge photograph. It read well alone, but it
 * made signing in the one dark surface in a product that is otherwise blush
 * throughout, and the delivered designs put the brand here instead. The website
 * draws the same panel.
 */
function ArtPanel({ mobile, height }: { mobile?: boolean; height?: number }) {
  return (
    <View style={mobile ? [styles.artMobile, height ? { height } : null] : styles.artDesktop}>
      <BrandDecor />
      <View style={[styles.artInner, mobile ? styles.artInnerMobile : null]}>
        <Image
          source={require('../../assets/logo/heartlink-emblem.png')}
          style={mobile ? styles.artEmblemMobile : styles.artEmblem}
          contentFit="contain"
        />
        <Text style={[styles.artWordmark, mobile ? styles.artWordmarkMobile : null]}>
          <Text style={{ color: colors.textPrimary }}>Heart</Text>
          <Text style={{ color: colors.primary }}>Link</Text>
        </Text>

        {!mobile ? (
          <>
            <GoldRule />
            <Text style={styles.artTagline}>{BRAND_TAGLINE}</Text>
            <Text style={styles.artSub}>{BRAND_SUBTITLE}</Text>

            <View style={styles.artPromises}>
              {BRAND_PROMISES.map((promise) => (
                <View key={promise.key} style={styles.artPromise}>
                  <Feather name={PROMISE_ICONS[promise.icon]} size={19} color={colors.primary} />
                  <Text style={styles.artPromiseText}>{promise.title}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.artTaglineMobile}>{BRAND_TAGLINE}</Text>
        )}
      </View>
    </View>
  );
}

/** The shared promise vocabulary, drawn with this app's icon set. */
const PROMISE_ICONS: Record<BrandPromiseIcon, keyof typeof Feather.glyphMap> = {
  heart: 'heart',
  mail: 'mail',
  book: 'book-open',
  support: 'headphones',
};

/** Hairline with a gold heart at its centre, the divider used across the designs. */
function GoldRule() {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleLine} />
      <Feather name="heart" size={11} color={colors.gold} />
      <View style={styles.ruleLine} />
    </View>
  );
}

export function AuthShell({ title, subtitle, children, footer, compact, minimal, staticEntrance, stickyHeader }: AuthShellProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Cap the art as a share of the viewport so short phones are not swallowed.
  const artHeight = Math.round(
    Math.min(compact ? 172 : auth.mobileArtHeight, height * (compact ? 0.2 : 0.32)),
  );
  const isDesktop = width >= 900;
  const reduce = useReduceMotion() || !!staticEntrance;

  // Gentle mount entrance: art panel rises first (desktop only), then the form.
  const heroReveal = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const formReveal = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    const formIn = Animated.timing(formReveal, {
      toValue: 1,
      duration: 400,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    if (isDesktop) {
      Animated.sequence([
        Animated.timing(heroReveal, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.delay(80),
        formIn,
      ]).start();
    } else {
      heroReveal.setValue(1);
      formIn.start();
    }
  }, [reduce, isDesktop, heroReveal, formReveal]);

  const revealStyle = (v: Animated.Value) =>
    reduce
      ? null
      : {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        };

  const headBlock = (
    <>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, stickyHeader ? styles.subtitleSticky : null]}>{subtitle}</Text> : null}
      {stickyHeader}
    </>
  );

  const formContent = (
    <>
      {stickyHeader ? null : headBlock}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.rootDesktop}>
        <View style={styles.split}>
          <Animated.View style={[styles.artCol, revealStyle(heroReveal)]}>
            <ArtPanel />
          </Animated.View>
          <Animated.View style={[styles.formCol, revealStyle(formReveal)]}>
            <KeyboardAvoidingView style={styles.flex} behavior={undefined}>
              <ScrollView
                contentContainerStyle={styles.scrollDesktop}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.contentClamp}>{formContent}</View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Mobile: art owns the top third; the form rises over it as a white sheet.
  return (
    <View style={styles.rootMobile}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {minimal ? (
          <View style={styles.slimBar}>
            <Brand size={20} />
          </View>
        ) : (
          <ArtPanel mobile height={artHeight} />
        )}
        <Animated.View style={[styles.sheet, revealStyle(formReveal)]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {stickyHeader ? <View style={styles.stickyHead}>{headBlock}</View> : null}
            <ScrollView
              contentContainerStyle={[styles.scrollMobile, { paddingBottom: 24 + insets.bottom }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {formContent}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Brand panel (client screen 10)
  artInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  // Centred, not bottom-aligned: the form sheet rises over the last 20px of
  // this panel, so anything pushed to the bottom is clipped by it. The extra
  // bottom padding keeps the optical centre above that overlap.
  artInnerMobile: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  artEmblem: { width: 76, height: 66 },
  artEmblemMobile: { width: 46, height: 40 },
  artWordmark: { fontFamily: 'BreeSerif_400Regular', fontSize: 38, lineHeight: 46 },
  artWordmarkMobile: { fontSize: 26, lineHeight: 32 },
  artTagline: { fontFamily: 'BreeSerif_400Regular', fontSize: 18, color: colors.textPrimary, textAlign: 'center' },
  artTaglineMobile: { fontFamily: 'BreeSerif_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  artSub: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  artPromises: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
  },
  artPromise: { alignItems: 'center', gap: 6, width: 132 },
  artPromiseText: { fontFamily: 'Inter_400Regular', fontSize: 11.5, lineHeight: 15, color: colors.textSecondary, textAlign: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch', maxWidth: 320 },
  ruleLine: { flex: 1, height: 1, backgroundColor: colors.goldFaint },

  rootDesktop: { flex: 1, backgroundColor: colors.bgDeep },
  rootMobile: { flex: 1, backgroundColor: colors.bgDeep },
  split: { flex: 1, flexDirection: 'row' },
  artCol: { flex: 1.15, minWidth: 0 },
  artDesktop: { flex: 1, overflow: 'hidden' },
  slimBar: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 26 },
  artMobile: { height: auth.mobileArtHeight, overflow: 'hidden' },
  statementGold: { color: colors.goldBright },
  formCol: { flex: 1, backgroundColor: colors.bgElevated },
  scrollDesktop: { flexGrow: 1, padding: 48, justifyContent: 'center', alignItems: 'center' },
  contentClamp: { width: '100%', maxWidth: 420 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    marginTop: -20,
  },
  scrollMobile: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26 },
  stickyHead: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: spacing.md },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  // Ink, not sidebarText: that near-white was for the midnight bridge panel this
  // replaced, and on the light panel it is invisible against the cream.
  wordHeart: { fontFamily: 'BreeSerif_400Regular', color: colors.textPrimary },
  wordLink: { fontFamily: 'BreeSerif_400Regular', color: colors.primary },
  title: { ...type.h1, marginBottom: spacing.xs },
  subtitle: { ...type.bodyMuted, fontSize: 14, marginBottom: spacing.xl, maxWidth: 460 },
  // Tighter when pinned: the header is always on screen, so it should not eat
  // the room the answers need.
  subtitleSticky: { marginBottom: spacing.md },
  body: { gap: spacing.lg },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
});
