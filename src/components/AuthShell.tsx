import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

import { art } from '../art';
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
function Statement({ size }: { size: number }) {
  return (
    <Text style={[styles.statement, { fontSize: size, lineHeight: size * 1.28 }]}>
      Every letter is a bridge.{'\n'}
      <Text style={styles.statementGold}>Love knows no bounds.</Text>
    </Text>
  );
}

/** Midnight art panel: bridge artwork, veil, brand, statement, trust proofs. */
function ArtPanel({ mobile, height }: { mobile?: boolean; height?: number }) {
  return (
    <View style={mobile ? [styles.artMobile, height ? { height } : null] : styles.artDesktop}>
      <LinearGradient
        colors={[...auth.panelGradient]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={art.signinBridge}
        style={[StyleSheet.absoluteFill, { opacity: auth.artOpacity }]}
        contentFit="cover"
      />
      <LinearGradient
        colors={mobile ? [...auth.veilMobile] : [...auth.veilDesktop]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.artBrand, mobile ? styles.artBrandMobile : null]}>
        <Brand size={mobile ? 18 : 21} />
      </View>
      <View style={[styles.artBottom, mobile ? styles.artBottomMobile : null]}>
        <Statement size={mobile ? 20 : 34} />
        {!mobile ? (
          <View style={styles.proofRow}>
            <View style={styles.proof}>
              <Feather name="shield" size={15} color={colors.goldBright} />
              <Text style={styles.proofText}>Profiles reviewed before they appear</Text>
            </View>
            <View style={styles.proof}>
              <Feather name="mail" size={15} color={colors.goldBright} />
              <Text style={styles.proofText}>Private, secure mail</Text>
            </View>
          </View>
        ) : null}
      </View>
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
            <Brand size={17} />
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
  rootDesktop: { flex: 1, backgroundColor: colors.bgDeep },
  rootMobile: { flex: 1, backgroundColor: auth.panelGradient[0] },
  split: { flex: 1, flexDirection: 'row' },
  artCol: { flex: 1.15, minWidth: 0 },
  artDesktop: { flex: 1, overflow: 'hidden' },
  slimBar: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30 },
  artMobile: { height: auth.mobileArtHeight, overflow: 'hidden' },
  artBrand: { position: 'absolute', top: 44, left: 48, zIndex: 2 },
  artBrandMobile: { top: 18, left: 18 },
  artBottom: { flex: 1, justifyContent: 'flex-end', padding: 48 },
  artBottomMobile: { padding: 18 },
  statement: { fontFamily: 'BreeSerif_400Regular', color: colors.sidebarText, maxWidth: 400 },
  statementGold: { color: colors.goldBright },
  proofRow: { flexDirection: 'row', gap: 22, marginTop: 26, flexWrap: 'wrap' },
  proof: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proofText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.sidebarTextMuted },
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
  wordHeart: { fontFamily: 'BreeSerif_400Regular', color: colors.sidebarText },
  wordLink: { fontFamily: 'BreeSerif_400Regular', color: colors.primary },
  title: { ...type.h1, marginBottom: spacing.xs },
  subtitle: { ...type.bodyMuted, fontSize: 14, marginBottom: spacing.xl, maxWidth: 460 },
  // Tighter when pinned: the header is always on screen, so it should not eat
  // the room the answers need.
  subtitleSticky: { marginBottom: spacing.md },
  body: { gap: spacing.lg },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
});
