import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '../../src/components/primitives';
import { spacing, type } from '../../src/theme';

const SUPPORT_EMAIL = 'support@heartlink.example';

const FAQ = [
  {
    q: 'How do connections work?',
    a: 'Browse profiles on the Home screen and Like the ones you want to connect with. Liked profiles are saved to your Liked tab.',
  },
  {
    q: 'Are profiles verified?',
    a: 'Yes. Every profile is reviewed by our team for authenticity and safety before it appears in browse.',
  },
  {
    q: 'How do I manage my account?',
    a: 'Open the Account tab to view your sign-in details and sign out.',
  },
] as const;

export default function SupportScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Support</Text>
      <Text style={styles.sub}>We're here to help. Reach out any time.</Text>

      <Card style={styles.contactCard}>
        <Text style={type.h2}>Contact our team</Text>
        <Text style={type.bodyMuted}>
          Email us and we'll typically respond within 24 hours.
        </Text>
        <Button
          label={`Email ${SUPPORT_EMAIL}`}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
      </Card>

      <Text style={styles.faqHeading}>Frequently asked</Text>
      {FAQ.map((item) => (
        <Card key={item.q} style={styles.faqCard}>
          <Text style={styles.q}>{item.q}</Text>
          <Text style={styles.a}>{item.a}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.md },
  heading: { ...type.h1, textAlign: 'center' },
  sub: { ...type.bodyMuted, textAlign: 'center', marginBottom: spacing.sm },
  contactCard: { gap: spacing.sm },
  faqHeading: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.lg },
  faqCard: { gap: spacing.xs },
  q: { ...type.body, fontFamily: 'Inter_600SemiBold' },
  a: { ...type.bodyMuted },
});
