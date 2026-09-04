import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader, SettingsRow } from '../src/components/ScreenHeader';
import { colors, radii, spacing } from '../src/theme';

/** Privacy and safety controls, grouped away from day-to-day account settings. */
export default function PrivacySafetyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Privacy & safety" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Control who can reach you, and read how your information is handled.
        </Text>

        <Text style={styles.groupLabel}>PEOPLE</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="slash"
            label="Blocked accounts"
            onPress={() => router.push('/blocked')}
            last
          />
        </View>

        <Text style={styles.groupLabel}>DOCUMENTS</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => router.push('/policy?doc=terms')}
          />
          <SettingsRow
            icon="lock"
            label="Privacy Policy"
            onPress={() => router.push('/policy?doc=privacy')}
            last
          />
        </View>

        <Text style={styles.note}>
          Letters are reviewed by our team before they are posted, and replies are scanned in.
          Facility staff may also read mail under their own rules.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: 0 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },
  groupLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingBottom: 7,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: colors.textMuted, lineHeight: 18, paddingHorizontal: 4 },
});
