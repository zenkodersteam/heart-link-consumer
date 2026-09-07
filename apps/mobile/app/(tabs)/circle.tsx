import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { art } from '../../src/art';
import { Button, Pill } from '../../src/components/primitives';
import {
  MAILROOM_RULES,
  MOMENTS,
  PLAN_WORD_LIMITS,
  PRE_SEND_CHECKLIST,
  TOTAL_PROMPT_COUNT,
  findMoment,
  findPrompt,
  type Moment,
  type Prompt,
} from '../../src/lib/support-circle-content';
import { colors, fonts, radii, spacing, type } from '../../src/theme';

/**
 * Support Circle (Phase 0 demo slice). A private, guided writing surface for
 * outside members: prompts grouped by the moment you are writing in, plus the
 * practical letter-writing support that keeps a letter deliverable.
 *
 * Deliberately NOT the Resources/Support art-tile grid. That pattern is spent
 * twice already; a third copy would read as a clone screen. This surface is
 * editorial: one piece of art (the hero), hairline-separated lists, and a
 * stationery panel for the prompt itself. Gold carries authorship, pink carries
 * action, and there is exactly one pink glow on the page.
 *
 * Route is `/circle`, not `/support-circle`, because AppNav's `isActive` uses
 * startsWith and `/support-circle` would light the Support nav item too.
 *
 * Scope (docs/ai/support-circle-roadmap.md): local content only, no API, no
 * posting, no comments, no reactions, no member-to-member visibility of any
 * kind. The moderated-groups band is labelled as future work with no signup and
 * no date. No new verification claims appear anywhere in this file.
 */

const webTransition =
  Platform.OS === 'web'
    ? {
        transitionProperty: 'background-color, border-color, transform, box-shadow, opacity',
        transitionDuration: '160ms',
        transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
      }
    : null;

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function useReduceMotion() {
  return useMemo(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);
}

/** Web-only clipboard. No new dependency, and the action hides where it can't work. */
const clipboard =
  Platform.OS === 'web'
    ? (globalThis as { navigator?: { clipboard?: { writeText(text: string): Promise<void> } } }).navigator?.clipboard ??
      null
    : null;

type Level =
  | { kind: 'home' }
  | { kind: 'moment'; momentKey: string }
  | { kind: 'prompt'; momentKey: string; promptId: string }
  | { kind: 'letters' };

export default function SupportCircleScreen() {
  const [view, setView] = useState<Level>({ kind: 'home' });
  const reduce = useReduceMotion();

  // One authored motion moment: each level settles in as it opens. Everything
  // else on this surface is still.
  const reveal = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) return;
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 280, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [view, reduce, reveal]);
  const revealStyle = reduce
    ? null
    : {
        opacity: reveal,
        transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
      };

  const moment = view.kind === 'moment' || view.kind === 'prompt' ? findMoment(view.momentKey) : null;
  const prompt = view.kind === 'prompt' ? findPrompt(view.momentKey, view.promptId) : null;

  let body;
  if (prompt && moment) {
    body = (
      <PromptPage
        moment={moment}
        prompt={prompt}
        onBack={() => setView({ kind: 'moment', momentKey: moment.key })}
      />
    );
  } else if (moment) {
    body = (
      <MomentPage
        moment={moment}
        onBack={() => setView({ kind: 'home' })}
        onOpen={(p) => setView({ kind: 'prompt', momentKey: moment.key, promptId: p.id })}
      />
    );
  } else if (view.kind === 'letters') {
    body = <LettersPage onBack={() => setView({ kind: 'home' })} />;
  } else {
    body = (
      <Home
        onOpenMoment={(m) => setView({ kind: 'moment', momentKey: m.key })}
        onOpenLetters={() => setView({ kind: 'letters' })}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={revealStyle}>{body}</Animated.View>
    </ScrollView>
  );
}

// ---- Level 1 ----

function Home({
  onOpenMoment,
  onOpenLetters,
}: {
  onOpenMoment: (m: Moment) => void;
  onOpenLetters: () => void;
}) {
  const router = useRouter();

  return (
    <>
      <View style={styles.hero}>
        <Image source={art.supportHero} style={styles.heroArt} contentFit="cover" />
        <View style={styles.heroVeil} />
        <Text style={styles.heroTitle}>Support Circle</Text>
        <Text style={styles.heroSub}>
          Guided prompts and practical help for writing to someone inside. Written by HeartLink, private to you.
        </Text>
      </View>

      <Text style={styles.sectionHeading}>Where are you right now?</Text>
      <Text style={styles.sectionSub}>
        {TOTAL_PROMPT_COUNT} prompts, grouped by the moment you are writing in.
      </Text>

      <View style={styles.list}>
        {MOMENTS.map((m, i) => (
          <Pressable
            key={m.key}
            onPress={() => onOpenMoment(m)}
            accessibilityRole="button"
            accessibilityLabel={`${m.title}, ${m.prompts.length} prompts`}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.row,
              webTransition,
              i > 0 ? styles.rowDivider : null,
              hovered ? styles.rowHover : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            {({ hovered }: { hovered?: boolean }) => (
              <>
                <View style={styles.rowDisc}>
                  <Feather name={m.icon} size={17} color={colors.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{m.title}</Text>
                  <Text style={styles.rowBlurb}>{m.blurb}</Text>
                </View>
                <Text style={styles.rowCount}>{m.prompts.length}</Text>
                <Feather
                  name="chevron-right"
                  size={17}
                  color={hovered ? colors.primary : colors.textMuted}
                  style={[styles.rowChev, hovered ? styles.rowChevHover : null]}
                />
              </>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onOpenLetters}
        accessibilityRole="button"
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.panel,
          webTransition,
          hovered ? styles.panelHover : null,
          pressed ? { opacity: 0.92 } : null,
        ]}
      >
        <View style={styles.panelBody}>
          <Text style={styles.panelTitle}>Before you send</Text>
          <Text style={styles.panelText}>
            What facility mailrooms reject, how long your letter can be on your plan, and a checklist to run before it
            goes out. The part that protects whether your words actually arrive.
          </Text>
        </View>
        <Feather name="arrow-right" size={18} color={colors.primary} />
      </Pressable>

      <View style={styles.future}>
        <Pill label="Later" tone="gold" />
        <Text style={styles.futureTitle}>Moderated supporter groups</Text>
        <Text style={styles.futureText}>
          One day, small topic-scoped groups where supporters can hear from each other: first-time letter writers,
          families at a distance, people preparing for someone coming home. Every contribution reviewed before it
          appears, never an open board, and never a way for members to contact each other directly.
        </Text>
        <Text style={styles.futureText}>
          We will open it when there is a team to moderate it properly, and not before. There is nothing to sign up for
          yet.
        </Text>
      </View>

      <View style={styles.footnote}>
        <Feather name="lock" size={14} color={colors.textSecondary} />
        <Text style={styles.footnoteText}>
          Support Circle is private to you. Nothing here is shared with other members, and nothing you read here is
          visible to anyone else.
        </Text>
      </View>

      <Pressable onPress={() => router.push('/resources' as never)} style={styles.quietLinkWrap}>
        <Text style={styles.quietLink}>
          Looking for counseling, reentry, or legal organizations? Those live in Resources.
        </Text>
      </Pressable>
    </>
  );
}

// ---- Level 2: a moment ----

function MomentPage({
  moment,
  onBack,
  onOpen,
}: {
  moment: Moment;
  onBack: () => void;
  onOpen: (p: Prompt) => void;
}) {
  return (
    <>
      <Crumb onBack={onBack} trail="Support Circle" current={moment.title} />

      <View style={styles.pageHead}>
        <View style={styles.pageHeadRow}>
          <Feather name={moment.icon} size={19} color={colors.gold} />
          <Text style={styles.pageTitle}>{moment.title}</Text>
        </View>
        <Text style={styles.pageIntro}>{moment.intro}</Text>
      </View>

      <View style={styles.list}>
        {moment.prompts.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => onOpen(p)}
            accessibilityRole="button"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.row,
              webTransition,
              i > 0 ? styles.rowDivider : null,
              hovered ? styles.rowHover : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            {({ hovered }: { hovered?: boolean }) => (
              <>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.rowBlurb} numberOfLines={2}>
                    {p.body}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={17}
                  color={hovered ? colors.primary : colors.textMuted}
                  style={[styles.rowChev, hovered ? styles.rowChevHover : null]}
                />
              </>
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
}

// ---- Level 3: one prompt, as a page of stationery ----

function PromptPage({ moment, prompt, onBack }: { moment: Moment; prompt: Prompt; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(() => {
    if (!clipboard) return;
    clipboard
      .writeText(prompt.body)
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard permission denied: leave the label alone rather than
        // claiming a copy that did not happen.
      });
  }, [prompt.body]);

  return (
    <>
      <Crumb onBack={onBack} trail={moment.title} current={prompt.title} />

      <View style={styles.sheet}>
        <View style={styles.sheetRule} />
        <Text style={styles.sheetTitle}>{prompt.title}</Text>
        <Text style={styles.sheetBody}>{prompt.body}</Text>

        <View style={styles.whyBlock}>
          <Text style={styles.whyLabel}>Why this works</Text>
          <Text style={styles.whyText}>{prompt.why}</Text>
        </View>
      </View>

      {clipboard ? (
        <View style={styles.sheetActions}>
          <Button
            label={copied ? 'Copied' : 'Copy prompt'}
            variant="secondary"
            onPress={copy}
            accessibilityLabel="Copy this prompt"
          />
          <Text style={styles.sheetActionNote}>
            Paste it wherever you draft. Nothing is sent from here.
          </Text>
        </View>
      ) : null}
    </>
  );
}

// ---- Level 2: letter-writing support ----

function LettersPage({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Crumb onBack={onBack} trail="Support Circle" current="Before you send" />

      <View style={styles.pageHead}>
        <View style={styles.pageHeadRow}>
          <Feather name="send" size={19} color={colors.gold} />
          <Text style={styles.pageTitle}>Before you send</Text>
        </View>
        <Text style={styles.pageIntro}>
          Every facility mailroom reviews incoming mail and sets its own rules. These are the patterns that get letters
          returned most often, and the habits that keep yours moving.
        </Text>
      </View>

      <Text style={styles.groupHeading}>What gets a letter rejected</Text>
      <View style={styles.list}>
        {MAILROOM_RULES.map((r, i) => (
          <View key={r.avoid} style={[styles.ruleRow, i > 0 ? styles.rowDivider : null]}>
            <View style={styles.ruleLine}>
              <Feather name="x" size={15} color={colors.danger} style={styles.ruleIcon} />
              <Text style={styles.ruleAvoid}>{r.avoid}</Text>
            </View>
            <View style={styles.ruleLine}>
              <Feather name="check" size={15} color={colors.success} style={styles.ruleIcon} />
              <Text style={styles.ruleInstead}>{r.instead}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.groupHeading}>How long your letter can be</Text>
      <View style={styles.list}>
        {PLAN_WORD_LIMITS.map((p, i) => (
          <View key={p.key} style={[styles.limitRow, i > 0 ? styles.rowDivider : null]}>
            <Text style={styles.limitPlan}>{p.plan}</Text>
            <Text style={styles.limitWords}>{p.words} words</Text>
            <Text style={styles.limitFeels}>{p.feels}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.groupNote}>
        The limit keeps every letter printing cleanly as one piece of mail, which is one less reason for a mailroom to
        hold it.
      </Text>

      <Text style={styles.groupHeading}>Run this before it goes out</Text>
      <View style={styles.list}>
        {PRE_SEND_CHECKLIST.map((item, i) => (
          <View key={item} style={[styles.checkRow, i > 0 ? styles.rowDivider : null]}>
            <Feather name="check-circle" size={16} color={colors.gold} style={styles.ruleIcon} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Crumb({ onBack, trail, current }: { onBack: () => void; trail: string; current: string }) {
  return (
    <Pressable onPress={onBack} accessibilityRole="button" style={styles.crumb}>
      <Text style={styles.crumbText}>
        {trail} <Text style={styles.crumbSep}>›</Text> <Text style={styles.crumbActive}>{current}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    minWidth: 0,
    // React Native Web ScrollView content containers size to the viewport and
    // then add padding on top, which creates a subtle horizontal overflow on
    // mobile. Constrain the web content box by the horizontal padding so the
    // right edge stays inside the viewport.
    ...Platform.select({ web: { width: 'calc(100% - 48px)', maxWidth: 'calc(100% - 48px)' } as object }),
  },

  // Hero: the one piece of art and the one pink glow on this surface.
  hero: {
    marginRight: spacing.xl,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 28,
    marginBottom: spacing.xxl,
    backgroundColor: colors.sidebar,
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(420px 240px at 88% 0%, rgba(219, 2, 82,0.34), transparent 62%), linear-gradient(160deg, #1B0826, #2E1240 55%, #3A1550)',
      } as object,
    }),
  },
  heroArt: { ...StyleSheet.absoluteFillObject, opacity: 0.34 },
  heroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,5,31,0.45)',
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage: 'linear-gradient(90deg, rgba(22,5,31,0.82) 25%, rgba(22,5,31,0.35) 75%)',
      } as object,
    }),
  },
  heroTitle: { fontFamily: fonts.heading, fontSize: 30, lineHeight: 38, color: colors.sidebarText },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 23,
    color: colors.sidebarTextMuted,
    marginTop: 8,
    maxWidth: 460,
    flexShrink: 1,
  },

  sectionHeading: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
  sectionSub: { fontFamily: fonts.body, fontSize: 13.5, color: colors.textSecondary, marginTop: 4, marginBottom: 14 },

  // Hairline-separated editorial list, not a tile grid.
  list: {
    marginRight: spacing.xl,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 8px 20px rgba(46,18,64,0.06)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, paddingHorizontal: 20, minWidth: 0 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowHover: { backgroundColor: 'rgba(219, 2, 82,0.035)' },
  rowDisc: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldFaint,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.textPrimary, flexShrink: 1 },
  rowBlurb: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary, flexShrink: 1 },
  rowCount: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: colors.textSecondary },
  rowChev: {
    ...Platform.select({
      web: { transitionProperty: 'transform', transitionDuration: '160ms' } as object,
    }),
  },
  rowChevHover: { transform: [{ translateX: 3 }] },

  // Practical section entry: muted surface + gold hairline, so it reads as a
  // different kind of thing from the prompt list without shouting.
  panel: {
    marginRight: spacing.xl,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 22,
    paddingVertical: 22,
    paddingHorizontal: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,168,79,0.45)',
    backgroundColor: colors.surfaceMuted,
  },
  panelHover: { borderColor: colors.gold, transform: [{ translateY: -2 }] },
  panelBody: { flex: 1, gap: 5 },
  panelTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  panelText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textSecondary,
    maxWidth: '100%',
    flexShrink: 1,
  },

  // Future work. Intentionally the quietest block on the page: no fill, no
  // shadow, no button, no date, no capture.
  future: {
    marginRight: spacing.xl,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    marginTop: 30,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,168,79,0.45)',
    gap: 10,
  },
  futureTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.textPrimary },
  futureText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: '100%',
    flexShrink: 1,
    ...Platform.select({ web: { whiteSpace: 'normal', overflowWrap: 'break-word' } as object }),
  },

  footnote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 26, minWidth: 0, maxWidth: '100%' },
  footnoteText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
    ...Platform.select({ web: { whiteSpace: 'normal', overflowWrap: 'break-word' } as object }),
  },

  quietLinkWrap: { marginTop: 12, alignSelf: 'flex-start', maxWidth: '100%' },
  quietLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.primary,
    flexShrink: 1,
    ...Platform.select({ web: { whiteSpace: 'normal', overflowWrap: 'break-word' } as object }),
  },

  // Level 2 / 3 chrome
  crumb: { alignSelf: 'flex-start', marginBottom: 18 },
  crumbText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textMuted },
  crumbSep: { color: colors.textMuted },
  crumbActive: { color: colors.primary },

  pageHead: { marginBottom: 20, gap: 8 },
  pageHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontFamily: fonts.heading, fontSize: 25, lineHeight: 32, color: colors.textPrimary },
  pageIntro: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 24, color: colors.textSecondary, maxWidth: 620 },

  groupHeading: { fontFamily: fonts.heading, fontSize: 17, color: colors.textPrimary, marginTop: 28, marginBottom: 10 },
  groupNote: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 20, color: colors.textSecondary, marginTop: 10, maxWidth: 620 },

  // The prompt itself, set as a page rather than a card.
  sheet: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 30,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 10px 26px rgba(46,18,64,0.07)',
  },
  sheetRule: { height: 2, width: 54, borderRadius: 2, backgroundColor: colors.gold, marginBottom: 18 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, color: colors.textPrimary },
  sheetBody: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 33,
    color: colors.textPrimary,
    marginTop: 16,
    maxWidth: 620,
  },
  whyBlock: { marginTop: 26, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 7 },
  whyLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  whyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 24, color: colors.textSecondary, maxWidth: 620 },

  sheetActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 20 },
  sheetActionNote: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textSecondary, flexShrink: 1 },

  // Mailroom do / don't pairs
  ruleRow: { paddingVertical: 18, paddingHorizontal: 20, gap: 9 },
  ruleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  ruleIcon: { marginTop: 3 },
  ruleAvoid: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 22, color: colors.textPrimary, flex: 1 },
  ruleInstead: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 22, color: colors.textSecondary, flex: 1 },

  // Word limits
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 20 },
  limitPlan: { fontFamily: fonts.heading, fontSize: 15.5, color: colors.textPrimary, width: 84 },
  limitWords: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textPrimary, width: 92 },
  limitFeels: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.textSecondary, flex: 1, minWidth: 130 },

  // Pre-send checklist
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 15, paddingHorizontal: 20 },
  checkText: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 22, color: colors.textSecondary, flex: 1 },
});
