import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ValueProps } from '../../src/components/ValueProps';
import { Button } from '../../src/components/primitives';
import { colors, spacing, type } from '../../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.wordmark}>
            <Text style={styles.wordHeart}>Heart</Text>
            <Text style={styles.wordLink}>Link</Text>
          </View>
          <View style={styles.underline} />
          <Text style={styles.tagline}>~ Love Knows No Bounds ~</Text>
          <Text style={styles.subtitle}>Meaningful connections beyond boundaries.</Text>

          <View style={styles.actions}>
            <Button label="Create Account" onPress={() => router.push('/(auth)/sign-up')} />
            <Button label="Log In" variant="secondary" onPress={() => router.push('/(auth)/sign-in')} />
          </View>
        </View>

        <ValueProps />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  wordHeart: { fontFamily: 'BreeSerif_400Regular', fontSize: 44, color: colors.textPrimary },
  wordLink: { fontFamily: 'BreeSerif_400Regular', fontSize: 44, color: colors.primary },
  underline: { height: 2, width: 64, backgroundColor: colors.gold, borderRadius: 999, marginVertical: spacing.sm },
  tagline: { fontFamily: 'BreeSerif_400Regular', fontSize: 18, color: colors.textSecondary },
  subtitle: { ...type.bodyMuted, textAlign: 'center', marginBottom: spacing.xl },
  actions: { width: '100%', maxWidth: 360, gap: spacing.md, marginTop: spacing.lg },
});
