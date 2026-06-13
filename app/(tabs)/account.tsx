import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '../../src/components/primitives';
import { SubscriptionPlans } from '../../src/components/SubscriptionPlans';
import { colors, spacing, type } from '../../src/theme';

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } finally {
      setSigningOut(false);
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={type.h1}>Account</Text>
        <Text style={type.bodyMuted}>Manage your subscription, settings, and support.</Text>

        <Card style={styles.card}>
          <Text style={type.label}>SIGNED IN AS</Text>
          <Text style={[type.body, styles.email]}>{email}</Text>
        </Card>

        <SubscriptionPlans />

        <View style={styles.actions}>
          <Button label="Sign out" variant="secondary" onPress={onSignOut} loading={signingOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  body: { padding: spacing.xl, gap: spacing.lg },
  card: { marginTop: spacing.md, gap: spacing.xs },
  email: { color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  actions: { marginTop: spacing.lg },
});
