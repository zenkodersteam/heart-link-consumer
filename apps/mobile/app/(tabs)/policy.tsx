import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PLACEHOLDER_NOTICE,
  PRIVACY_SECTIONS,
  PRIVACY_VERSION,
  TERMS_SECTIONS,
  TERMS_VERSION,
} from '@heartlink/consumer-content';
import { colors, radii, spacing, type } from '../../src/theme';

/**
 * Terms of Service and Privacy Policy.
 *
 * One screen for both, chosen by `?doc=terms|privacy`. Both stores require
 * these to be reachable inside the app, not only on a website, and reviewers
 * check the link works.
 */
export default function PolicyScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc === 'privacy';

  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const version = isPrivacy ? PRIVACY_VERSION : TERMS_VERSION;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.version}>Version {version}</Text>

        <View style={styles.notice}>
          <Feather name="info" size={13} color={colors.gold} />
          <Text style={styles.noticeText}>{PLACEHOLDER_NOTICE}</Text>
        </View>

        {sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.para}>{s.body}</Text>
          </View>
        ))}

        <Pressable
          onPress={() => router.replace(isPrivacy ? '/policy?doc=terms' : '/policy?doc=privacy')}
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            Read the {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { padding: 4 },
  title: { ...type.h2, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  version: { ...type.caption, color: colors.textMuted },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.goldFaint,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  noticeText: { ...type.caption, color: colors.textSecondary, flex: 1 },
  section: { gap: 6 },
  heading: { ...type.h2, color: colors.textPrimary },
  para: { ...type.body, color: colors.textSecondary, lineHeight: 21 },
  switchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  switchText: { ...type.body, color: colors.primary, fontFamily: 'Inter_600SemiBold' },
});
