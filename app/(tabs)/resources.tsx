import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button, Card, Pill } from '../../src/components/primitives';
import { colors, spacing, type } from '../../src/theme';

/**
 * Static resources directory (MVP). The searchable, backend-driven directory in
 * the client screen is deferred — see docs/ai/decisions.md. Categories and links
 * here are curated content, not fetched.
 */
const CATEGORIES = [
  {
    title: 'Prison Awareness',
    body: 'Learn about the justice system, incarceration realities, and how you can make a difference.',
    tags: ['Education', 'Advocacy', 'Awareness'],
  },
  {
    title: 'Reentry Support',
    body: 'Resources for successful reintegration: housing, employment, and life skills.',
    tags: ['Employment', 'Housing', 'Life Skills'],
  },
  {
    title: 'Mental Health Support',
    body: 'Mental health resources, crisis support, and wellness tools for healing and growth.',
    tags: ['Counseling', 'Wellness', 'Crisis Support'],
  },
  {
    title: 'Community Support Groups',
    body: 'Connect with local and online groups that offer understanding and support.',
    tags: ['Peer Support', 'Groups', 'Mentorship'],
  },
] as const;

export default function ResourcesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cols = width >= 800 ? 2 : 1;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Resources &amp; Support</Text>
      <Text style={styles.sub}>Information, guidance, and support for every step of the journey.</Text>

      <View style={styles.grid}>
        {CATEGORIES.map((c) => (
          <View key={c.title} style={[styles.col, { width: `${100 / cols}%` }]}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardBody}>{c.body}</Text>
              <View style={styles.tags}>
                {c.tags.map((t) => (
                  <Pill key={t} label={t} tone="neutral" />
                ))}
              </View>
            </Card>
          </View>
        ))}
      </View>

      <Card style={styles.contactCard}>
        <View style={styles.contactCopy}>
          <Text style={styles.cardTitle}>Need personalized support?</Text>
          <Text style={styles.cardBody}>
            Our support team is here to help you find the right resources for your situation.
          </Text>
        </View>
        <Button label="Contact Support" onPress={() => router.push('/support')} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl },
  heading: { ...type.h1, textAlign: 'center' },
  sub: { ...type.bodyMuted, textAlign: 'center', marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm },
  col: { padding: spacing.sm },
  card: { gap: spacing.sm, height: '100%' },
  cardTitle: { ...type.h2 },
  cardBody: { ...type.bodyMuted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  contactCard: {
    marginTop: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactCopy: { flex: 1, minWidth: 220, gap: spacing.xs },
});
