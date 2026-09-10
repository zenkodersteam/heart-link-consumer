import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { needsReviewSubmission, type OutsideUserProfile } from '@heartlink/consumer-api';
import {
  REVIEW_PREF_GROUPS,
  summarizePrefs,
  type PreferenceState,
} from '@heartlink/consumer-content';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ScreenHeader, SettingsRow } from '../../components/ScreenHeader';
import { ListSkeleton } from '../../components/Skeleton';
import { humanError } from '../../lib/errors';
import { useToast } from '../../components/Toast';
import { pickPhoto, type PhotoSource } from '../../lib/pick-photo';
import { useApiClientFactory } from '../../lib/use-api-client';
import { useMyProfile } from '../../lib/use-my-profile';
import { useNavigation } from '@react-navigation/native';

import type { RootNavigation } from '../../navigations/types';

import { colors, radii, spacing, themedStyles, type } from '../../theme';

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
 *
 * Saving also sends the profile for review. A save on its own only writes the
 * draft, which left the change sitting where nobody would see it while the
 * screen promised it was being reviewed - and the only way to actually reach
 * the queue was to walk the sign-up questions again to their submit step.
 */
/**
 * The moderation state, in the two colours it actually means.
 *
 * Approved is settled, needs-changes wants attention, and everything between
 * is simply in progress — three tones rather than four, because "draft" and
 * "in review" ask nothing of the member.
 */
function statusPillStyle(status: string | undefined) {
  if (status === 'approved') return styles.statusApproved;
  if (status === 'rejected') return styles.statusRejected;
  return styles.statusPending;
}

function statusTextStyle(status: string | undefined) {
  if (status === 'approved') return styles.statusApprovedText;
  if (status === 'rejected') return styles.statusRejectedText;
  return styles.statusPendingText;
}

export default function EditProfileScreen() {
  const navigation = useNavigation<RootNavigation>();
  const apiFactory = useApiClientFactory();
  const { profile, loading, refresh } = useMyProfile();

  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const toast = useToast();

  /**
   * Replace the profile photo.
   *
   * This screen showed the picture and said what it was for, and offered no way
   * to change it — the only upload in the whole app was a step of the sign-up
   * questions, so changing a photo afterwards meant walking those again.
   */
  async function onPickPhoto(source: PhotoSource) {
    setSourceOpen(false);
    try {
      const picked = await pickPhoto(source);
      // Closing the picker is a normal outcome, not a failure.
      if (!picked) return;
      setUploading(true);
      const api = await apiFactory();
      const saved = await api.uploadMyProfilePhoto(picked.part, picked.name);
      // A finished profile is put in the queue by the upload itself, so this
      // says what actually happened rather than promising the photo is
      // already on show. Mid-onboarding it is still a draft, and the last
      // step of the flow submits it.
      toast.show(
        'Photo updated',
        saved.status === 'pending'
          ? 'Our team looks at new photos before they reach other members.'
          : 'It will go out with the rest of your profile.',
      );
      // Still called for the profiles the upload left alone — a rejected one,
      // or a draft the member is editing outside the flow.
      await sendForReview(saved);
      await refresh();
    } catch (e) {
      // A refused permission throws with wording worth showing as it is.
      toast.error(humanError(e, 'Could not upload that photo.'));
    } finally {
      setUploading(false);
    }
  }

  function open(key: FieldKey) {
    setDraft((profile?.[key] as string | null) ?? '');
    setEditing(key);
  }

  /**
   * Hands a saved change to the moderation queue.
   *
   * Kept separate from the save itself so a submit that fails cannot lose the
   * edit: the change is already stored either way, and this only decides
   * whether it is queued. The member is told which of the two happened.
   */
  async function sendForReview(saved: OutsideUserProfile) {
    if (!needsReviewSubmission(saved.status)) return;
    try {
      const api = await apiFactory();
      await api.submitMyProfile();
      toast.show('Sent for review', 'Our team looks at changes before they reach other members.');
    } catch {
      toast.error('Saved, but not sent for review. Try saving again to send it to our team.');
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const api = await apiFactory();
      const saved = await api.updateMyProfile({ [editing]: draft.trim() });
      setEditing(null);
      await sendForReview(saved);
      await refresh();
    } catch (e) {
      toast.error(humanError(e, 'We could not save that. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const field = editing ? FIELDS[editing] : null;
  // `matchPreferences` is `unknown` on the wire - the server stores whatever the
  // flow put there - so it is narrowed once, here, rather than at each row.
  const prefs = (profile?.matchPreferences ?? {}) as PreferenceState;
  const statusLabel =
    profile?.status === 'approved'
      ? 'Approved'
      : profile?.status === 'pending'
        ? 'In review'
        : profile?.status === 'rejected'
          ? 'Needs changes'
          : profile?.onboardingComplete
            ? 'Changes not sent'
            : 'Draft';

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader title="Your profile" />

      {loading && !profile ? (
        <View style={styles.body}>
          <ListSkeleton count={3} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* A profile header, not a settings row.
              This was a 56px thumbnail in a list line with a "Change" link on
              the right — the shape a web settings page uses. A phone puts the
              person at the top: their face, their name, and the badge you tap
              to replace it. */}
          <View style={styles.identity}>
            <Pressable
              onPress={() => setSourceOpen(true)}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={profile?.primaryPhotoUrl ? 'Change your photo' : 'Add a photo'}
              style={({ pressed }: { pressed: boolean }) => [
                styles.avatarWrap,
                pressed ? { transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              {profile?.primaryPhotoUrl ? (
                <Image
                  source={{ uri: profile.primaryPhotoUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarEmpty]}>
                  <Text style={styles.avatarInitial}>
                    {(profile?.displayName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.cameraBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Feather name="camera" size={14} color={colors.onPrimary} />
                )}
              </View>
            </Pressable>

            <Text style={styles.identityName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {profile?.displayName || 'Your profile'}
            </Text>

            {/* The moderation state as a pill. As a grey subtitle in the header
                it read as a page title's decoration rather than as the status
                of the thing on screen. */}
            <View style={[styles.statusPill, statusPillStyle(profile?.status)]}>
              <Text style={[styles.statusPillText, statusTextStyle(profile?.status)]}>
                {statusLabel}
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

          {/* Four rows, not one link to the start of onboarding. These answers
              only read as a group, so they have no editor here - but each row
              opens just its own step, saves, and comes back. One row saying
              "Review" that led to nine questions is what made changing a single
              answer feel like doing the whole sign-up again. */}
          <Text style={styles.groupLabel}>PREFERENCES</Text>
          <View style={styles.card}>
            {REVIEW_PREF_GROUPS.map((group, i) => (
              <SettingsRow
                key={group.step}
                label={group.label}
                value={summarizePrefs(prefs, group.keys)}
                onPress={() => navigation.navigate('Onboarding', { section: group.step })}
                last={i === REVIEW_PREF_GROUPS.length - 1}
              />
            ))}
          </View>
          <Text style={styles.note}>
            Saving a change sends your profile to our team. They review it before it
            reaches other members, usually within a day.
          </Text>
        </ScrollView>
      )}

      <ConfirmDialog
        open={sourceOpen}
        icon="camera"
        title="Profile photo"
        message="A clear photo of your face builds trust with the people you write to."
        actions={[
          { label: 'Choose from library', onPress: () => void onPickPhoto('library') },
          { label: 'Take a photo', onPress: () => void onPickPhoto('camera') },
        ]}
        onCancel={() => setSourceOpen(false)}
      />

      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        {/*
          `behavior` is set on both platforms now. It was iOS-only, so on
          Android this sheet sat under the keyboard with the field it exists to
          edit hidden behind it. "height" rather than "padding" because the
          sheet is centred in the backdrop: padding would pad a container that
          is already the full screen and move nothing.
        */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  identity: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceMuted },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...type.h1, fontSize: 34, color: colors.textMuted },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    // A ring in the page colour, so the badge reads as sitting on the photo
    // rather than punched out of it.
    borderWidth: 3,
    borderColor: colors.bgDeep,
  },
  identityName: { ...type.h2, fontSize: 19, marginTop: spacing.xs },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusPillText: { ...type.caption, fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statusApproved: { backgroundColor: 'rgba(62, 155, 110, 0.14)' },
  statusApprovedText: { color: colors.success },
  statusRejected: { backgroundColor: 'rgba(214, 69, 80, 0.14)' },
  statusRejectedText: { color: colors.danger },
  statusPending: { backgroundColor: colors.goldFaint },
  statusPendingText: { color: colors.gold },
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
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  btn: { flex: 1, minHeight: 46, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  btnQuiet: { borderWidth: 1, borderColor: colors.border },
  btnQuietText: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.textSecondary },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5, color: colors.onPrimary },
}));
