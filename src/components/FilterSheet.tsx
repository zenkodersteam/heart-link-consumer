import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ListPublicProfilesQuery, PlanTier, ProfileGender } from '../lib/api';
import { colors, radii, spacing, type } from '../theme';
import { Button, Field } from './primitives';

const GENDER_OPTIONS: { value: ProfileGender | undefined; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: undefined, label: 'Both' },
];

interface FilterSheetProps {
  open: boolean;
  query: ListPublicProfilesQuery;
  onClose: () => void;
  onApply: (next: ListPublicProfilesQuery) => void;
}

const PLAN_TIERS: { value: PlanTier; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'vip', label: 'VIP' },
];

export function FilterSheet({ open, query, onClose, onApply }: FilterSheetProps) {
  const [ageMin, setAgeMin] = useState(query.ageMin?.toString() ?? '');
  const [ageMax, setAgeMax] = useState(query.ageMax?.toString() ?? '');
  const [state, setState] = useState(query.state ?? '');
  const [facilityId, setFacilityId] = useState(query.facilityId ?? '');
  const [planTier, setPlanTier] = useState<PlanTier | undefined>(query.planTier);
  const [gender, setGender] = useState<ProfileGender | undefined>(query.gender);

  function apply() {
    const next: ListPublicProfilesQuery = { limit: query.limit, offset: 0 };
    if (ageMin) next.ageMin = parseInt(ageMin, 10);
    if (ageMax) next.ageMax = parseInt(ageMax, 10);
    if (state.trim()) next.state = state.trim().toUpperCase();
    if (facilityId.trim()) next.facilityId = facilityId.trim();
    if (planTier) next.planTier = planTier;
    if (gender) next.gender = gender;
    onApply(next);
    onClose();
  }

  function clear() {
    setAgeMin('');
    setAgeMax('');
    setState('');
    setFacilityId('');
    setPlanTier(undefined);
    setGender(undefined);
    onApply({ limit: query.limit, offset: 0 });
    onClose();
  }

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Filters</Text>
            <Text style={styles.subtitle}>Narrow your browse by age, location, and plan.</Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Field label="Age min" value={ageMin} onChangeText={setAgeMin} keyboardType="number-pad" placeholder="18" />
              </View>
              <View style={styles.col}>
                <Field label="Age max" value={ageMax} onChangeText={setAgeMax} keyboardType="number-pad" placeholder="99" />
              </View>
            </View>

            <Field
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="2-letter code, e.g. TX"
              maxLength={2}
              autoCapitalize="characters"
            />

            <View style={styles.tierGroup}>
              <Text style={styles.label}>GENDER</Text>
              <Text style={styles.helper}>Select who you'd like to connect with</Text>
              <View style={styles.tierRow}>
                {GENDER_OPTIONS.map((g) => {
                  const active = gender === g.value;
                  return (
                    <Pressable
                      key={g.label}
                      onPress={() => setGender(g.value)}
                      style={[styles.tier, active ? styles.tierActive : null]}
                    >
                      <Text style={[styles.tierLabel, active ? styles.tierLabelActive : null]}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Field
              label="Facility ID"
              value={facilityId}
              onChangeText={setFacilityId}
              placeholder="optional UUID"
              autoCapitalize="none"
            />

            <View style={styles.tierGroup}>
              <Text style={styles.label}>PLAN TIER</Text>
              <View style={styles.tierRow}>
                {PLAN_TIERS.map((t) => {
                  const active = planTier === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setPlanTier(active ? undefined : t.value)}
                      style={[styles.tier, active ? styles.tierActive : null]}
                    >
                      <Text style={[styles.tierLabel, active ? styles.tierLabelActive : null]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <Button label="Clear" variant="secondary" onPress={clear} />
              <View style={styles.actionSpacer} />
              <Button label="Apply filters" onPress={apply} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.md,
  },
  content: { padding: spacing.xl, gap: spacing.md },
  title: { ...type.h1 },
  subtitle: { ...type.bodyMuted, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  label: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.xs },
  helper: { ...type.caption, marginTop: -spacing.xs, marginBottom: spacing.xs },
  tierGroup: { gap: spacing.xs },
  tierRow: { flexDirection: 'row', gap: spacing.sm },
  tier: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
  },
  tierActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  tierLabel: { ...type.button, color: colors.textSecondary, fontSize: 14 },
  tierLabelActive: { color: colors.primary },
  actions: { flexDirection: 'row', marginTop: spacing.lg, alignItems: 'center' },
  actionSpacer: { width: spacing.md },
});
