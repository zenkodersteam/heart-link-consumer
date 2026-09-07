import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { art } from '../../src/art';
import { Button } from '../../src/components/primitives';
import {
  POPULAR_QUESTIONS,
  SUPPORT_TOPICS,
  type SupportTopic,
  type SupportTopicKey,
} from '@heartlink/consumer-content';
import { colors, fonts, radii, spacing, type } from '../../src/theme';

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || null;

/**
 * Support (UI lift, SeatGeek help-center pattern): midnight hero with search,
 * three topic cards, popular questions. Topic pages are accordions with the
 * "Still stuck?" band. Verification copy follows the locked rule: profiles
 * originate as mailed paper applications reviewed before publishing; the gold
 * badge marks profiles that pass additional identity checks. Refund and
 * address-privacy answers are placeholders pending client-confirmed copy.
 */

/** Illustration is per-surface; the answers themselves are shared. */
const TOPIC_ART: Record<SupportTopicKey, number> = {
  letters: art.topicLetters,
  billing: art.topicBilling,
  safety: art.topicSafety,
};

function contactSupport() {
  if (SUPPORT_EMAIL) void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
}

export default function SupportScreen() {
  const router = useRouter();
  const [topicKey, setTopicKey] = useState<SupportTopicKey | null>(null);
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const topic = SUPPORT_TOPICS.find((t) => t.key === topicKey) ?? null;

  if (topic) {
    return <TopicPage topic={topic} onBack={() => setTopicKey(null)} />;
  }

  const q = query.trim().toLowerCase();
  const matches = q
    ? SUPPORT_TOPICS.flatMap((t) => t.faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)).map((f) => ({ topic: t, f })))
    : [];

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Image source={art.supportHero} style={styles.heroArt} contentFit="cover" />
        <View style={styles.heroVeil} />
        <Text style={styles.heroTitle}>How can we help?</Text>
        <Text style={styles.heroSub}>Real people, within 24 hours.</Text>
        <View style={styles.searchPill}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Type your question here..."
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.searchGo}>
            <Feather name="search" size={17} color={colors.onPrimary} />
          </View>
        </View>
      </View>

      {q ? (
        <View style={styles.faqList}>
          {matches.length === 0 ? (
            <Text style={styles.empty}>No answers match "{query.trim()}".</Text>
          ) : (
            matches.map(({ topic: t, f }) => (
              <Pressable key={t.key + f.q} onPress={() => { setTopicKey(t.key); setQuery(''); }} style={styles.qRowOuter}>
                <Text style={styles.qRowText}>{f.q}</Text>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <>
          <View style={[styles.cards, !isDesktop ? styles.cardsStacked : null]}>
            {SUPPORT_TOPICS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTopicKey(t.key)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.supCard,
                  hovered ? styles.supCardHover : null,
                  pressed ? { transform: [{ scale: 0.995 }] } : null,
                ]}
              >
                {({ hovered }: { hovered?: boolean }) => (
                  <>
                    <View style={styles.scart}>
                      <Image
                        source={TOPIC_ART[t.key]}
                        style={[styles.scartImg, hovered ? styles.scartImgHover : null]}
                        contentFit="contain"
                      />
                    </View>
                    <Text style={styles.supCardTitle}>{t.title}</Text>
                    <Text style={styles.supCardBody}>{t.cardBlurb}</Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.faq}>
            <Text style={styles.faqHeading}>Popular questions</Text>
            {POPULAR_QUESTIONS.map((p) => (
              <Pressable key={p.q} onPress={() => setTopicKey(p.topic)} style={styles.qRowOuter}>
                <Text style={styles.qRowText}>{p.q}</Text>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>

          {/* Support answers the app; Support Circle answers the blank page. */}
          <Pressable onPress={() => router.push('/circle' as never)} style={styles.circleLink}>
            <Feather name="edit-3" size={15} color={colors.primary} />
            <Text style={styles.circleLinkText}>
              Stuck on what to write? Support Circle has guided prompts and letter-writing help.
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function TopicPage({ topic, onBack }: { topic: SupportTopic; onBack: () => void }) {
  const [open, setOpen] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={styles.crumb}>
        <Text style={styles.crumbText}>
          Support <Text style={styles.crumbSep}>›</Text> <Text style={styles.crumbActive}>{topic.title}</Text>
        </Text>
      </Pressable>

      <View style={styles.cathero}>
        <Image source={TOPIC_ART[topic.key]} style={styles.catheroArt} contentFit="cover" />
        <View style={styles.catheroVeil} />
        <View style={styles.catheroTxt}>
          <Text style={styles.catheroTitle}>{topic.title}</Text>
          <Text style={styles.catheroBlurb}>{topic.blurb}</Text>
        </View>
      </View>

      {topic.faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <View key={f.q} style={styles.acc}>
            <Pressable
              onPress={() => setOpen(isOpen ? -1 : i)}
              style={({ hovered }: { hovered?: boolean }) => [
                styles.accRow,
                hovered ? { backgroundColor: 'rgba(219, 2, 82,0.03)' } : null,
              ]}
            >
              <Text style={[styles.accQ, isOpen ? { color: colors.primary } : null]}>{f.q}</Text>
              <Feather
                name="chevron-right"
                size={18}
                color={isOpen ? colors.primary : colors.textMuted}
                style={isOpen ? styles.accChevOpen : undefined}
              />
            </Pressable>
            {isOpen ? <Text style={styles.accA}>{f.a}</Text> : null}
          </View>
        );
      })}

      <View style={styles.stuckBand}>
        <View style={styles.stuckCopy}>
          <Text style={styles.stuckTitle}>Still stuck?</Text>
          <Text style={styles.stuckBody}>Real people, within 24 hours.</Text>
        </View>
        <Button label="Contact Support" onPress={contactSupport} disabled={!SUPPORT_EMAIL} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl },

  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    marginBottom: spacing.xl,
    backgroundColor: colors.sidebar,
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(420px 240px at 85% 0%, rgba(219, 2, 82,0.4), transparent 60%), linear-gradient(160deg, #1B0826, #2E1240 55%, #451A5E)',
      } as object,
    }),
  },
  heroArt: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  heroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,5,31,0.35)',
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage: 'linear-gradient(90deg, rgba(22,5,31,0.55), rgba(22,5,31,0.15))',
      } as object,
    }),
  },
  heroTitle: { fontFamily: fonts.heading, fontSize: 30, color: colors.sidebarText },
  heroSub: { fontFamily: fonts.body, fontSize: 14, color: colors.sidebarTextMuted, marginTop: 6, marginBottom: 18 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.pill,
    paddingLeft: 22,
    paddingRight: 8,
    paddingVertical: 8,
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 10px 30px rgba(22,5,31,0.35)',
  },
  searchInput: { flex: 1, paddingVertical: 4, color: colors.textPrimary, fontFamily: fonts.body, fontSize: 14.5 },
  searchGo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(135deg, #F02168, #DB0252)' } as object,
    }),
  },

  cards: { flexDirection: 'row', gap: 16 },
  cardsStacked: { flexDirection: 'column' },
  supCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 20,
    paddingBottom: 20,
    alignItems: 'center',
    overflow: 'hidden',
    boxShadow:
      '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06), 0 24px 48px rgba(46,18,64,0.10)',
  },
  supCardHover: {
    transform: [{ translateY: -4 }],
    boxShadow:
      '0 2px 4px rgba(46,18,64,0.06), 0 14px 28px rgba(46,18,64,0.10), 0 34px 64px rgba(46,18,64,0.14)',
  },
  // Raster art band: contain over radial midnight, feathered mask (web).
  scart: {
    height: 116,
    alignSelf: 'stretch',
    marginBottom: 14,
    backgroundColor: '#13051D',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backgroundImage: 'radial-gradient(70% 160% at 50% 50%, #13051D 40%, #241031 100%)',
      } as object,
    }),
  },
  scartImg: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        maskImage: 'radial-gradient(80% 95% at 50% 50%, #000 42%, transparent 90%)',
        WebkitMaskImage: 'radial-gradient(80% 95% at 50% 50%, #000 42%, transparent 90%)',
        transitionProperty: 'transform',
        transitionDuration: '350ms',
      } as object,
    }),
  },
  scartImgHover: { transform: [{ scale: 1.06 }] },
  supCardTitle: { fontFamily: fonts.heading, fontSize: 15.5, color: colors.textPrimary, paddingHorizontal: 18, textAlign: 'center' },
  supCardBody: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary, paddingHorizontal: 18, textAlign: 'center', marginTop: 5 },

  faq: { marginTop: 26 },
  faqHeading: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginBottom: 6 },
  faqList: { marginTop: spacing.sm },
  qRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  qRowText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, flexShrink: 1 },
  circleLink: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20 },
  circleLinkText: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 20, color: colors.primary, flexShrink: 1 },
  empty: { ...type.bodyMuted, textAlign: 'center', paddingVertical: spacing.xl },

  // Topic page
  crumb: { alignSelf: 'flex-start', marginBottom: 16 },
  crumbText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textMuted },
  crumbSep: { color: colors.textMuted },
  crumbActive: { color: colors.primary },
  cathero: {
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 22,
    justifyContent: 'flex-end',
    backgroundColor: colors.midnight,
  },
  catheroArt: { ...StyleSheet.absoluteFillObject },
  catheroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,5,31,0.45)',
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage:
          'linear-gradient(90deg, rgba(22,5,31,0.85) 30%, rgba(22,5,31,0.25) 60%, rgba(22,5,31,0) 85%)',
      } as object,
    }),
  },
  catheroTxt: { padding: 22, paddingHorizontal: 26 },
  catheroTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.sidebarText },
  catheroBlurb: { fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(251,245,232,0.85)', marginTop: 4 },

  acc: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(46,18,64,0.05), 0 6px 16px rgba(46,18,64,0.06)',
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 17,
    paddingHorizontal: 20,
  },
  accQ: { fontFamily: fonts.bodySemibold, fontSize: 14.5, color: colors.textPrimary, flexShrink: 1 },
  accChevOpen: { transform: [{ rotate: '90deg' }] },
  accA: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 23,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  stuckBand: {
    marginTop: 22,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,168,79,0.4)',
    backgroundColor: colors.sidebar,
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(300px 160px at 92% 10%, rgba(219, 2, 82,0.35), transparent 60%), linear-gradient(150deg, #1B0826, #2E1240 60%, #3A1550)',
      } as object,
    }),
  },
  stuckCopy: { flex: 1, minWidth: 200, gap: 3 },
  stuckTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.sidebarText },
  stuckBody: { fontFamily: fonts.body, fontSize: 13.5, color: colors.sidebarTextMuted },
});
