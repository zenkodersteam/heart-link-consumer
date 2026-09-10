import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Platform,
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
import { useKeyboard } from '../lib/use-keyboard';
import { KeyboardSafeScrollView } from './KeyboardSafeScrollView';
import { auth, colors, fonts, radii, spacing, themedStyles, type } from '../theme';

const EMBLEM = require('../../assets/logo/heartlink-emblem.png');

/** How far the form sheet rides up over whatever is above it. */
const SHEET_LIP = 20;
/** The slim brand bar's height, fixed so it can be animated away. */
const SLIM_BAR_HEIGHT = 60;
/** Long enough to read as the art stepping aside, short enough to keep up. */
const CROWN_MS = 220;


function useReduceMotion() {
  return useMemo(() => {
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
  /**
   * Step back, when the screen has steps of its own.
   *
   * Onboarding is nine steps inside a single route, so neither the Android
   * back button nor an iOS edge swipe can move between them — there is nothing
   * for the router to pop. Given this, the shell wires both to the callback so
   * the platform gestures do what someone expects instead of leaving the flow.
   */
  onBack?: () => void;
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

export function AuthShell({ title, subtitle, children, footer, compact, minimal, staticEntrance, stickyHeader, onBack }: AuthShellProps) {
  const keyboard = useKeyboard();

  // Android's own back button, when there are steps to go back through.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  useEffect(() => {
    if (!onBack || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackRef.current?.();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  // iOS has no gesture on a route with no stack behind it, so the same swipe
  // is built here: a drag from the left edge, as elsewhere in the app.
  const edgeSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, g) =>
          Boolean(onBackRef.current) &&
          g.dx > 12 &&
          Math.abs(g.dy) < 12 &&
          g.moveX - g.dx < 44,
        onPanResponderRelease: (_evt, g) => {
          if (g.dx > 80 || g.vx > 0.4) onBackRef.current?.();
        },
      }),
    [],
  );
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Cap the art as a share of the viewport so short phones are not swallowed.
  const artHeight = Math.round(
    Math.min(compact ? 172 : auth.mobileArtHeight, windowHeight * (compact ? 0.2 : 0.32)),
  );
  const isDesktop = width >= 900;
  const reduce = useReduceMotion() || !!staticEntrance;

  /**
   * The artwork stands down while someone is typing.
   *
   * It is a welcome, not a fixture, and once the keyboard is up it is the one
   * thing on screen that can be given up. Keeping it cost a third of the phone
   * on every auth screen: on sign-up that left the password and confirm fields
   * below the keyboard with the form pinned in place, so the field being typed
   * into could not be seen at all. Collapsing it hands that third to the form,
   * which is enough for the whole of it to sit above the keyboard.
   *
   * It collapses to `SHEET_LIP` rather than to nothing: the sheet is pulled up
   * by exactly that much, so stopping there leaves its rounded top flush with
   * the safe area instead of sliding under the status bar.
   */
  const crown = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(crown, {
      toValue: keyboard.visible ? 1 : 0,
      duration: reduce ? 0 : CROWN_MS,
      // Height is a layout property; the native driver cannot carry it.
      useNativeDriver: false,
    }).start();
  }, [keyboard.visible, crown, reduce]);

  const crownHeight = crown.interpolate({
    inputRange: [0, 1],
    outputRange: [minimal ? SLIM_BAR_HEIGHT : artHeight, SHEET_LIP],
  });

  // Gentle mount entrance: art panel rises first (desktop only), then the form.
  const heroReveal = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const formReveal = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    const formIn = Animated.timing(formReveal, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });
    if (isDesktop) {
      Animated.sequence([
        Animated.timing(heroReveal, { toValue: 1, duration: 400, useNativeDriver: true }),
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
            <KeyboardSafeScrollView
              contentContainerStyle={styles.scrollDesktop}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentClamp}>{formContent}</View>
            </KeyboardSafeScrollView>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Mobile: art owns the top third; the form rises over it as a white sheet.
  return (
    // Given the height the keyboard leaves, exactly as the tab shell is.
    //
    // The sheet used to run the full height of the screen, under the keyboard,
    // so iOS added a keyboard-height content inset to the scroll view inside
    // it. On a short form that is pure dead space: the fields could be dragged
    // up behind the artwork with a blank band where the keyboard sits. Ending
    // the sheet where the keyboard begins leaves nothing to over-scroll into.
    //
    // Android is resized by the OS already, so `overlap` is 0 there.
    <View
      {...(onBack ? edgeSwipe.panHandlers : null)}
      style={[
        styles.rootMobile,
        // `flex: 0` is load-bearing, not tidying. `rootMobile` is `flex: 1`,
        // which Yoga reads as `flexBasis: 0%` plus `flexGrow: 1` — and on the
        // main axis that beats an explicit `height` outright. So the shell
        // went on filling the window under the keyboard however small a height
        // was asked for here, which is why the sheet kept running underneath
        // it. `flex: 0` gives back `flexBasis: auto`, and the height takes.
        keyboard.overlap > 0 ? { flex: 0, height: windowHeight - keyboard.overlap } : null,
      ]}
    >
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Clipped, not squashed: the panel keeps its own height inside and
            this window closes over it, so the artwork slides away rather than
            distorting on its way out. */}
        <Animated.View style={[styles.crown, { height: crownHeight }]}>
          {minimal ? (
            <View style={styles.slimBar}>
              <Brand size={20} />
            </View>
          ) : (
            <ArtPanel mobile height={artHeight} />
          )}
        </Animated.View>
        <Animated.View style={[styles.sheet, revealStyle(formReveal)]}>
          {/*
            Was a KeyboardAvoidingView with behavior="padding" on iOS and
            nothing at all on Android. Padding shrinks this sheet as the
            keyboard rises, so the rounded top edge slid up over the artwork and
            every field re-flowed mid-animation — and Android users simply had
            fields under the keyboard with no way to reach them. Scrolling the
            content instead leaves the sheet exactly where it is.
          */}
          {stickyHeader ? <View style={styles.stickyHead}>{headBlock}</View> : null}
          <KeyboardSafeScrollView
            contentContainerStyle={[styles.scrollMobile, { paddingBottom: 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {formContent}
          </KeyboardSafeScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = themedStyles((colors) => ({
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
  crown: { overflow: 'hidden' },
  slimBar: { height: SLIM_BAR_HEIGHT, paddingHorizontal: 22, paddingTop: 10 },
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
    marginTop: -SHEET_LIP,
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
}));
