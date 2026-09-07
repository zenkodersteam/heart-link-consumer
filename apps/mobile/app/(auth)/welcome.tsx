import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BRAND_PROMISES,
  BRAND_SUBTITLE,
  BRAND_TAGLINE,
  type BrandPromiseIcon,
} from '@heartlink/consumer-content';

import { BrandDecor } from '../../src/components/BrandDecor';
import { Button } from '../../src/components/primitives';
import { colors, radii, spacing } from '../../src/theme';

/**
 * Splash — the first screen anyone signed out sees, matching screen 1 of the
 * client-delivered designs: emblem, wordmark, tagline, the two ways in, and the
 * four things HeartLink promises.
 *
 * This replaces the long marketing page that used to live here. A phone app
 * store listing already does the selling; by the time someone has installed it,
 * scrolling a pitch is in the way of signing in.
 *
 * Both buttons lead to the same place. Sign-in is one OTP flow that creates the
 * account when the address is new, so "Create Account" and "Log In" are the same
 * door — they are drawn separately because someone arriving without an account
 * should not have to work out that "Log In" will take them.
 */

/** The shared promise vocabulary, drawn with this app's icon set. */
const PROMISE_ICONS: Record<BrandPromiseIcon, keyof typeof Feather.glyphMap> = {
  heart: 'heart',
  mail: 'mail',
  book: 'book-open',
  support: 'headphones',
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  // Short phones get a smaller emblem so the buttons stay above the fold.
  const emblem = height < 700 ? 76 : 96;

  return (
    <SafeAreaView style={styles.safe}>
      <BrandDecor />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo/heartlink-emblem.png')}
            style={{ width: emblem, height: emblem }}
            contentFit="contain"
            accessibilityLabel="HeartLink"
          />

          <Text style={styles.wordmark}>
            <Text style={styles.wordHeart}>Heart</Text>
            <Text style={styles.wordLink}>Link</Text>
          </Text>

          <GoldRule />

          <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
          <Text style={styles.sub}>{BRAND_SUBTITLE}</Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Create Account"
            pill
            icon={<Feather name="user" size={17} color={colors.onPrimary} />}
            onPress={() => router.push('/(auth)/sign-in')}
          />
          <Button
            label="Log In"
            variant="secondary"
            pill
            style={styles.logIn}
            icon={<Feather name="lock" size={16} color={colors.textPrimary} />}
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>

        <GoldRule />

        <View style={styles.promises}>
          {BRAND_PROMISES.map((p) => (
            <View key={p.key} style={styles.promise}>
              <Feather name={PROMISE_ICONS[p.icon]} size={21} color={colors.primary} />
              <Text style={styles.promiseText}>{p.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Hairline with a gold heart at its centre, the divider used throughout the screens. */
function GoldRule() {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleLine} />
      <Feather name="heart" size={11} color={colors.gold} />
      <View style={styles.ruleLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },

  hero: { alignItems: 'center', gap: spacing.md },
  wordmark: { fontFamily: 'BreeSerif_400Regular', fontSize: 42, lineHeight: 50 },
  wordHeart: { color: colors.textPrimary },
  wordLink: { color: colors.primary },
  tagline: {
    fontFamily: 'BreeSerif_400Regular',
    fontSize: 19,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  ruleLine: { flex: 1, height: 1, backgroundColor: colors.goldFaint },

  actions: { gap: spacing.md },
  // The client screens draw the secondary action as a gold outline rather than
  // the neutral border the rest of the app uses.
  logIn: { borderColor: colors.gold, backgroundColor: 'transparent', borderRadius: radii.pill },

  promises: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  promise: { flex: 1, alignItems: 'center', gap: spacing.sm },
  promiseText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
