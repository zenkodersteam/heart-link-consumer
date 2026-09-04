import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader, SettingsRow } from '../../src/components/ScreenHeader';
import { ListSkeleton } from '../../src/components/Skeleton';
import { humanError } from '../../src/lib/errors';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { useMyProfile } from '../../src/lib/use-my-profile';
import { colors, radii, spacing, type } from '../../src/theme';

type FieldKey = 'displayName' | 'location' | 'bio';

const FIELDS: Record<
  FieldKey,
  { label: string; hint: string; placeholder: string; multiline?: boolean; max?: number }
> = {
  displayName: {
    label: 'Name',
    hint: 'People you write to see this name.',
    placeholder: 'Your name',
    max: 60,
  },
  location: {
    label: 'Location',
    hint: 'City and state. Your exact address is never shared.',
    placeholder: 'City, State',
    max: 120,
  },
  bio: {
    label: 'About you',
    hint: 'A few sentences about who you are and what you are hoping for.',
    placeholder: 'Tell your story…',
    multiline: true,
    max: 1200,
  },
};

/**
 * Edit an approved profile one field at a time.
 *
 * Until now the only way to change anything was to walk the nine sign-up
 * questions again, which is why tapping "your profile" felt like being sent
 * back to the start. The questions still make sense the first time; changing
 * one detail afterwards does not.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const apiFactory = useApiClientFactory();
  const { profile, loading, refresh } = useMyProfile();

  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(key: FieldKey) {
    setDraft((profile?.[key] as string | null) ?? '');
    setError(null);
    setEditing(key);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const api = await apiFactory();
      await api.updateMyProfile({ [editing]: draft.trim() });
      await refresh();
      setEditing(null);
    } catch (e) {
      setError(humanError(e, 'We could not save that. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const field = editing ? FIELDS[editing] : null;
  const statusLabel =
    profile?.status === 'approved'
      ? 'Approved'
      : profile?.status === 'pending'
        ? 'In review'
        : profile?.status === 'rejected'
          ? 'Needs changes'
          : 'Draft';

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader title="Your profile" subtitle={statusLabel} />

      {loading && !profile ? (
        <View style={styles.body}>
          <ListSkeleton count={3} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.photoRow}>
            {profile?.primaryPhotoUrl ? (
              <Image source={{ uri: profile.primaryPhotoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]}>
                <Text style={styles.photoInitial}>
                  {(profile?.displayName ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.photoTitle}>Profile photo</Text>
              <Text style={styles.photoHint}>
                {profile?.primaryPhotoUrl ? 'Visible to people you write to.' : 'No photo yet.'}
              </Text>
            </View>
          </View>

          <Text style={styles.groupLabel}>DETAILS</Text>
          <View style={styles.card}>
            <SettingsRow
              label={FIELDS.displayName.label}
              value={profile?.displayName ?? 'Not set'}
              onPress={() => open('displayName')}
            />
            <SettingsRow
              label={FIELDS.location.label}
              value={profile?.location ?? 'Not set'}
              onPress={() => open('location')}
            />
            <SettingsRow
              label={FIELDS.bio.label}
              value={profile?.bio ? 'Written' : 'Not set'}
              onPress={() => open('bio')}
              last
            />
          </View>

          <Text style={styles.groupLabel}>PREFERENCES</Text>
          <View style={styles.card}>
            <SettingsRow
              label="Interests, values and pace"
              value="Review"
              onPress={() => router.push('/onboarding' as never)}
              last
            />
          </View>
          <Text style={styles.note}>
            Changes are reviewed by our team before they appear to other members.
          </Text>
        </ScrollView>
      )}

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => (saving ? null : setEditing(null))} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{field?.label}</Text>
            <Text style={styles.sheetHint}>{field?.hint}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={field?.placeholder}
              placeholderTextColor={colors.textMuted}
              multiline={field?.multiline}
              maxLength={field?.max}
              autoFocus
              style={[styles.input, field?.multiline ? styles.inputMultiline : null]}
            />
            {field?.max ? (
              <Text style={styles.count}>
                {draft.length} / {field.max}
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setEditing(null)}
                disabled={saving}
                style={[styles.btn, styles.btnQuiet]}
              >
                <Text style={styles.btnQuietText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void save()} disabled={saving} style={[styles.btn, styles.btnPrimary]}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
  },
  photo: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceMuted },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sidebar },
  photoInitial: { fontFamily: 'Inter_600SemiBold', fontSize: 20, color: colors.sidebarText },
  photoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.textPrimary },
  photoHint: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
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
  note: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: colors.textMuted, paddingHorizontal: 4 },

  backdrop: { flex: 1, backgroundColor: 'rgba(22,5,31,0.55)', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: 6,
    boxShadow: '0 24px 64px rgba(46,18,64,0.28)',
  },
  sheetTitle: { ...type.h2, fontSize: 19, color: colors.textPrimary },
  sheetHint: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.bgCard,
  },
  inputMultiline: { minHeight: 140, textAlignVertical: 'top' },
  count: { fontFamily: 'Inter_400Regular', fontSize: 11.5, color: colors.textMuted, textAlign: 'right' },
  error: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: colors.danger },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  btn: { flex: 1, minHeight: 46, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  btnQuiet: { borderWidth: 1, borderColor: colors.border },
  btnQuietText: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.textSecondary },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.onPrimary },
});
