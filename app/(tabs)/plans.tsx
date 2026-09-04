import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SubscriptionPlans } from '../../src/components/SubscriptionPlans';
import { colors, spacing } from '../../src/theme';

/** Plans, on their own screen rather than buried at the bottom of Account. */
export default function PlansScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader title="Plans" subtitle="Choose what suits you" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <SubscriptionPlans />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { paddingBottom: spacing.xxl },
  inner: { paddingHorizontal: spacing.lg },
});
