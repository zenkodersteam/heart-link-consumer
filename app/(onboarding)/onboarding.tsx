import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { AuthShell } from '../../src/components/AuthShell';
import { Button, Field } from '../../src/components/primitives';
import { ApiClientError, type UpdateOutsideProfileInput } from '../../src/lib/api';
import { takePendingRoute } from '../../src/lib/pending-route';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { useMyProfile } from '../../src/lib/use-my-profile';
import { colors, fonts, radii, spacing, type } from '../../src/theme';

/**
 * Post-signup onboarding. Before an outside member can write to anyone, they
 * introduce themselves: name, birth date (18+), location, and a short bio.
 * Each step saves as a draft; the final step submits for moderation
 * (draft -> pending -> approved), mirroring how inmate profiles are reviewed.
 */

type StepKey = 'name' | 'location' | 'identity' | 'connection' | 'lifestyle' | 'communication' | 'story' | 'photo' | 'review';

const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  {
    key: 'name',
    title: 'Introduce yourself',
    subtitle:
      'Members you write to see your name. Real introductions are what make HeartLink safe for everyone.',
  },
  {
    key: 'location',
    title: 'Where are you based?',
    subtitle: 'Just a city and state. We never share your exact address.',
  },
  {
    key: 'identity',
    title: 'Tell us how you identify',
    subtitle: 'These are the same relationship-context questions from the intake form that apply to outside members too.',
  },
  {
    key: 'connection',
    title: 'What kind of connection do you want?',
    subtitle: 'This helps us guide people toward the kind of correspondence they are both looking for.',
  },
  {
    key: 'lifestyle',
    title: 'Share your values and lifestyle',
    subtitle: 'Choose the details that feel relevant. You can skip anything you would rather not answer.',
  },
  {
    key: 'communication',
    title: 'How do you like to communicate?',
    subtitle: 'Letters stay central, but pace and expectations matter before someone invests in a connection.',
  },
  {
    key: 'story',
    title: 'Tell your story',
    subtitle:
      'A few sentences about who you are and why you are here. This appears alongside your letters.',
  },
  {
    key: 'photo',
    title: 'Add a photo',
    subtitle:
      'A friendly photo builds trust with the people you write to. You can also add one later from Account.',
  },
  {
    key: 'review',
    title: 'Review and submit',
    subtitle:
      'Our team reviews every new member profile, usually within a day. You can browse right away.',
  },
];

/** Web-only file picker (native photo upload lands with the Flutter app). */
function pickWebImage(): Promise<File | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

const MIN_BIO_CHARS = 40;

type PrefKey =
  | 'iAm'
  | 'religion'
  | 'exercise'
  | 'education'
  | 'languages'
  | 'connectionTypes'
  | 'relationshipPace'
  | 'values'
  | 'interestedIn'
  | 'tattoos'
  | 'kids'
  | 'politicalViews'
  | 'loveLanguage'
  | 'interests'
  | 'communicationChannels'
  | 'communicationPace'
  | 'futureExpectations'
  | 'emotionalIntentions'
  | 'lookingFor';

type PreferenceState = Partial<Record<PrefKey, string | string[]>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function initialPrefs(value: unknown): PreferenceState {
  if (!isRecord(value)) return {};
  return value as PreferenceState;
}

const OPTIONS = {
  iAm: ['Straight Woman', 'Straight Man', 'Gay Man', 'Lesbian', 'Bisexual Man', 'Bisexual Woman', 'Non-binary', 'Other', 'Prefer not to say'],
  religion: ['Christian', 'Catholic', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Spiritual', 'Agnostic', 'Atheist', 'Other', 'Prefer not to say'],
  exercise: ['Never', 'Sometimes', 'Regularly', 'Daily'],
  education: ['Some HS', 'HS / GED', 'Some College', "Associate's", "Bachelor's", "Master's", 'Doctorate', 'Trade / Vocational'],
  languages: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Arabic', 'Sign Language', 'Other'],
  connectionTypes: ['Pen Pal', 'Friendship', 'Emotional Support', 'Serious Relationship', 'Marriage-minded', 'Faith-based'],
  relationshipPace: ['Very Slow', 'Slow', 'Moderate', 'Fast'],
  values: ['Family-oriented', 'Faith / Spirituality', 'Personal Growth', 'Loyalty', 'Humor', 'Health / Fitness', 'Education', 'Second-chance Mindset'],
  interestedIn: ['Men', 'Women', 'Non-binary', 'Everyone'],
  tattoos: ['None', 'A Few', 'Many', 'Heavily Tattooed'],
  kids: ['No Kids', 'Have Kids', 'Want Kids', 'Do Not Want Kids', 'Open'],
  politicalViews: ['Liberal', 'Conservative', 'Moderate', 'Libertarian', 'Progressive', 'Apolitical', 'Other', 'Prefer not to say'],
  loveLanguage: ['Words of Affirmation', 'Quality Time', 'Receiving Gifts', 'Acts of Service', 'Physical Touch'],
  interests: ['Music', 'Movies', 'Books', 'Sports', 'Cooking', 'Art', 'Fitness', 'Gaming', 'Nature', 'Writing', 'Meditation', 'Tech'],
  communicationChannels: ['Letters / Mail', 'Facility-approved messaging', 'Phone Calls', 'Video Visits'],
  communicationPace: ['Slow OK', 'Frequent'],
  futureExpectations: ['During incarceration only', 'Open after release', 'Marriage potential', 'Unsure'],
  emotionalIntentions: ['Regular conversation', 'Companionship', 'Motivation / growth', 'Fun / light', 'Deep connection', 'Emotional support', 'Spiritual connection', 'Future planning'],
} as const;

/** "MM/DD/YYYY" -> ISO "YYYY-MM-DD", or null when invalid. */
function parseDob(text: string): string | null {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function ageFromIso(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Auto-insert slashes while typing a date. */
function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isoToDisplay(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const apiFactory = useApiClientFactory();
  const { profile, loading, error: profileLoadError, refresh, apply } = useMyProfile();

  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [dobText, setDobText] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PreferenceState>(() => initialPrefs(profile?.matchPreferences));
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [done, setDone] = useState(false);

  // Seed local state from the server draft once it loads (nulls mean "untouched").
  const name = displayName ?? profile?.displayName ?? '';
  const dob = dobText ?? isoToDisplay(profile?.dateOfBirth ?? null);
  const loc = location ?? profile?.location ?? '';
  const story = bio ?? profile?.bio ?? '';
  const looking = lookingFor ?? ((preferences.lookingFor as string | undefined) ?? '');

  useEffect(() => {
    if (profile?.matchPreferences && Object.keys(preferences).length === 0) {
      setPreferences(initialPrefs(profile.matchPreferences));
    }
  }, [preferences, profile?.matchPreferences]);

  const step = STEPS[stepIndex];
  const rejected = profile?.status === 'rejected';

  const stepValid = useMemo(() => {
    switch (step.key) {
      case 'name': {
        const iso = parseDob(dob);
        return name.trim().length >= 2 && iso !== null && ageFromIso(iso) >= 18;
      }
      case 'location':
        return loc.trim().length >= 2;
      case 'story':
        return story.trim().length >= MIN_BIO_CHARS && looking.trim().length >= MIN_BIO_CHARS;
      default:
        return true;
    }
  }, [step.key, name, dob, loc, story, looking]);

  function validateWithMessage(): string | null {
    if (step.key === 'name') {
      if (name.trim().length < 2) return 'Please enter your name.';
      const iso = parseDob(dob);
      if (!iso) return 'Enter your birth date as MM/DD/YYYY.';
      if (ageFromIso(iso) < 18) return 'You must be 18 or older to join HeartLink.';
    }
    if (step.key === 'location' && loc.trim().length < 2) {
      return 'Please enter your city and state.';
    }
    if (step.key === 'story' && story.trim().length < MIN_BIO_CHARS) {
      const remaining = MIN_BIO_CHARS - story.trim().length;
      return `Tell us a little more, about ${remaining} more characters.`;
    }
    if (step.key === 'story' && looking.trim().length < MIN_BIO_CHARS) {
      const remaining = MIN_BIO_CHARS - looking.trim().length;
      return `Tell us what you're looking for, about ${remaining} more characters.`;
    }
    return null;
  }

  async function onPickPhoto() {
    setSaveError(null);
    const file = await pickWebImage();
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const api = await apiFactory();
      const updated = await api.uploadMyProfilePhoto(file, file.name);
      apply(updated);
    } catch (e) {
      setSaveError(e instanceof ApiClientError ? e.message : 'Could not upload the photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveDraft(input: UpdateOutsideProfileInput) {
    const api = await apiFactory();
    const updated = await api.updateMyProfile(input);
    apply(updated);
  }

  function setSinglePref(key: PrefKey, value: string) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMultiPref(key: PrefKey, value: string) {
    setPreferences((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  }

  async function onNext() {
    const message = validateWithMessage();
    if (message) {
      setFieldError(message);
      return;
    }
    setFieldError(null);
    setSaveError(null);
    setSaving(true);
    try {
      if (step.key === 'name') {
        await saveDraft({ displayName: name.trim(), dateOfBirth: parseDob(dob) ?? undefined });
      } else if (step.key === 'location') {
        await saveDraft({ location: loc.trim() });
      } else if (['identity', 'connection', 'lifestyle', 'communication'].includes(step.key)) {
        await saveDraft({ matchPreferences: preferences });
      } else if (step.key === 'story') {
        await saveDraft({ bio: story.trim(), matchPreferences: { ...preferences, lookingFor: looking.trim() } });
      } else if (step.key === 'photo') {
        // Optional step - nothing to save; the upload already happened in place.
      } else {
        const api = await apiFactory();
        const submitted = await api.submitMyProfile();
        apply(submitted);
        setDone(true);
        return;
      }
      setStepIndex((i) => i + 1);
    } catch (e) {
      setSaveError(e instanceof ApiClientError ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthShell title="Preparing your profile" subtitle="Loading your saved onboarding answers.">
        <View style={styles.loadingCard} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.primary} />
          <Text style={type.caption}>One moment...</Text>
        </View>
      </AuthShell>
    );
  }

  if (profileLoadError) {
    return (
      <AuthShell title="We couldn't load onboarding" subtitle="Your profile answers are safe. Try again when the connection settles.">
        <View style={styles.errorCard} accessibilityRole="alert">
          <Feather name="wifi-off" size={22} color={colors.gold} />
          <Text style={styles.errorCardText}>{profileLoadError}</Text>
        </View>
        <Button label="Try again" variant="secondary" onPress={refresh} />
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="You're all set"
        subtitle="Your profile is in review. You can start browsing now, and letters unlock the moment you're approved."
      >
        <View style={styles.doneBadge}>
          <Feather name="check-circle" size={40} color={colors.success} />
        </View>
        <Button
          label="Start browsing"
          onPress={() => router.replace((takePendingRoute() as never) ?? '/(tabs)')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={step.title} subtitle={step.subtitle} compact>
      {/* Compact responsive progress: avoids nine fixed dots cramping on small
          phones. The counter sits with the bar it describes — it used to live in
          the footer, nine steps away from the thing it labelled. */}
      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressStep}>
            Step {stepIndex + 1} of {STEPS.length}
          </Text>
          <Text style={styles.progressPct}>{Math.round(((stepIndex + 1) / STEPS.length) * 100)}%</Text>
        </View>
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: STEPS.length, now: stepIndex + 1 }}
        >
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      {rejected && profile?.moderationNotes ? (
        <View style={styles.rejectedNote}>
          <Feather name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.rejectedText}>
            Your last submission needed changes: {profile.moderationNotes}
          </Text>
        </View>
      ) : null}

      {step.key === 'name' ? (
        <>
          <Field
            label="Your name"
            value={name}
            onChangeText={(t) => {
              setDisplayName(t);
              setFieldError(null);
            }}
            placeholder="First name and last initial, e.g. Maria C."
            autoComplete="name"
          />
          <Field
            label="Date of birth"
            value={dob}
            onChangeText={(t) => {
              setDobText(formatDobInput(t));
              setFieldError(null);
            }}
            placeholder="MM/DD/YYYY"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Text style={type.caption}>You must be 18 or older. Your birth date is never shown to anyone.</Text>
        </>
      ) : null}

      {step.key === 'location' ? (
        <Field
          label="City and state"
          value={loc}
          onChangeText={(t) => {
            setLocation(t);
            setFieldError(null);
          }}
          placeholder="Atlanta, GA"
        />
      ) : null}

      {step.key === 'identity' ? (
        <>
          <OptionGroup label="I am" options={OPTIONS.iAm} value={preferences.iAm as string | undefined} onSelect={(v) => setSinglePref('iAm', v)} />
          <OptionGroup label="Religion" options={OPTIONS.religion} value={preferences.religion as string | undefined} onSelect={(v) => setSinglePref('religion', v)} />
          <OptionGroup label="Interested in" options={OPTIONS.interestedIn} values={preferences.interestedIn as string[] | undefined} onToggle={(v) => toggleMultiPref('interestedIn', v)} multi />
        </>
      ) : null}

      {step.key === 'connection' ? (
        <>
          <OptionGroup label="Type of connection" options={OPTIONS.connectionTypes} values={preferences.connectionTypes as string[] | undefined} onToggle={(v) => toggleMultiPref('connectionTypes', v)} multi />
          <OptionGroup label="Relationship pace" options={OPTIONS.relationshipPace} value={preferences.relationshipPace as string | undefined} onSelect={(v) => setSinglePref('relationshipPace', v)} />
          <OptionGroup label="Future expectations" options={OPTIONS.futureExpectations} value={preferences.futureExpectations as string | undefined} onSelect={(v) => setSinglePref('futureExpectations', v)} />
        </>
      ) : null}

      {step.key === 'lifestyle' ? (
        <>
          <OptionGroup label="Values & lifestyle" options={OPTIONS.values} values={preferences.values as string[] | undefined} onToggle={(v) => toggleMultiPref('values', v)} multi />
          <OptionGroup label="Interests" options={OPTIONS.interests} values={preferences.interests as string[] | undefined} onToggle={(v) => toggleMultiPref('interests', v)} multi />
          <OptionGroup label="Highest education" options={OPTIONS.education} value={preferences.education as string | undefined} onSelect={(v) => setSinglePref('education', v)} />
          <OptionGroup label="Exercise" options={OPTIONS.exercise} value={preferences.exercise as string | undefined} onSelect={(v) => setSinglePref('exercise', v)} />
          <OptionGroup label="Languages spoken" options={OPTIONS.languages} values={preferences.languages as string[] | undefined} onToggle={(v) => toggleMultiPref('languages', v)} multi />
          <OptionGroup label="Tattoos" options={OPTIONS.tattoos} value={preferences.tattoos as string | undefined} onSelect={(v) => setSinglePref('tattoos', v)} />
          <OptionGroup label="Kids" options={OPTIONS.kids} value={preferences.kids as string | undefined} onSelect={(v) => setSinglePref('kids', v)} />
          <OptionGroup label="Political views" options={OPTIONS.politicalViews} value={preferences.politicalViews as string | undefined} onSelect={(v) => setSinglePref('politicalViews', v)} />
        </>
      ) : null}

      {step.key === 'communication' ? (
        <>
          <OptionGroup label="Communication channels" options={OPTIONS.communicationChannels} values={preferences.communicationChannels as string[] | undefined} onToggle={(v) => toggleMultiPref('communicationChannels', v)} multi />
          <OptionGroup label="Communication pace" options={OPTIONS.communicationPace} value={preferences.communicationPace as string | undefined} onSelect={(v) => setSinglePref('communicationPace', v)} />
          <OptionGroup label="Emotional intentions" options={OPTIONS.emotionalIntentions} values={preferences.emotionalIntentions as string[] | undefined} onToggle={(v) => toggleMultiPref('emotionalIntentions', v)} multi />
          <OptionGroup label="Love language" options={OPTIONS.loveLanguage} value={preferences.loveLanguage as string | undefined} onSelect={(v) => setSinglePref('loveLanguage', v)} />
        </>
      ) : null}

      {step.key === 'story' ? (
        <>
          <Field
            label="About you"
            value={story}
            onChangeText={(t) => {
              setBio(t);
              setFieldError(null);
            }}
            placeholder="What brings you here? What kind of connection are you hoping for?"
            multiline
            numberOfLines={6}
            style={styles.bioInput}
          />
          <Text style={type.caption}>
            {story.trim().length < MIN_BIO_CHARS
              ? `${MIN_BIO_CHARS - story.trim().length} more characters to go`
              : 'Looking good.'}
          </Text>
          <Field
            label="What I'm looking for"
            value={looking}
            onChangeText={(t) => {
              setLookingFor(t);
              setPreferences((prev) => ({ ...prev, lookingFor: t }));
              setFieldError(null);
            }}
            placeholder="What kind of correspondence or connection would feel meaningful to you?"
            multiline
            numberOfLines={5}
            style={styles.bioInput}
          />
          <Text style={type.caption}>
            {looking.trim().length < MIN_BIO_CHARS
              ? `${MIN_BIO_CHARS - looking.trim().length} more characters to go`
              : 'This gives people a clearer reason to write back.'}
          </Text>
        </>
      ) : null}

      {step.key === 'photo' ? (
        <View style={styles.photoStep}>
          {profile?.primaryPhotoUrl ? (
            <Image
              source={{ uri: profile.primaryPhotoUrl }}
              style={styles.photoPreview}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.photoPreview, styles.photoEmpty]}>
              <Feather name="camera" size={28} color={colors.textMuted} />
            </View>
          )}
          {Platform.OS === 'web' ? (
            <Button
              label={profile?.primaryPhotoUrl ? 'Replace photo' : 'Choose a photo'}
              variant="secondary"
              loading={uploadingPhoto}
              onPress={onPickPhoto}
            />
          ) : (
            <Text style={type.caption}>Photo upload is available on the web app for now.</Text>
          )}
        </View>
      ) : null}

      {step.key === 'review' ? (
        <View style={styles.review}>
          <ReviewRow label="Name" value={name} />
          <ReviewRow label="Birth date" value={dob} />
          <ReviewRow label="Location" value={loc} />
          <ReviewRow label="Identity" value={summarizePrefs(preferences, ['iAm', 'religion', 'interestedIn'])} multiline />
          <ReviewRow label="Connection" value={summarizePrefs(preferences, ['connectionTypes', 'relationshipPace', 'futureExpectations'])} multiline />
          <ReviewRow label="Lifestyle" value={summarizePrefs(preferences, ['values', 'interests', 'education', 'exercise', 'languages', 'tattoos', 'kids', 'politicalViews'])} multiline />
          <ReviewRow label="Communication" value={summarizePrefs(preferences, ['communicationChannels', 'communicationPace', 'emotionalIntentions', 'loveLanguage'])} multiline />
          <ReviewRow label="About you" value={story} multiline />
          <ReviewRow label="What I'm looking for" value={looking} multiline />
        </View>
      ) : null}

      {fieldError ? <Text style={styles.error} accessibilityRole="alert">{fieldError}</Text> : null}
      {saveError ? <Text style={styles.error} accessibilityRole="alert">{saveError}</Text> : null}

      <Button
        label={step.key === 'review' ? 'Submit for review' : 'Continue'}
        onPress={onNext}
        loading={saving}
        disabled={!stepValid && step.key !== 'review'}
      />
      {stepIndex > 0 ? (
        <Pressable disabled={saving} onPress={() => setStepIndex((i) => i - 1)}>
          {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
            <Text style={[styles.back, hovered ? styles.backHover : null, pressed ? styles.backPressed : null, saving ? styles.backDisabled : null]}>Back</Text>
          )}
        </Pressable>
      ) : null}
    </AuthShell>
  );
}

function ReviewRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={[styles.reviewValue, multiline ? styles.reviewValueMultiline : null]} numberOfLines={multiline ? 6 : 1}>
        {value || '-'}
      </Text>
    </View>
  );
}

function summarizePrefs(prefs: PreferenceState, keys: PrefKey[]): string {
  const parts = keys.flatMap((key) => {
    const value = prefs[key];
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  });
  return parts.length ? parts.join(', ') : '-';
}

function OptionGroup({
  label,
  options,
  value,
  values,
  multi,
  onSelect,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  value?: string;
  values?: string[];
  multi?: boolean;
  onSelect?: (value: string) => void;
  onToggle?: (value: string) => void;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionWrap}>
        {options.map((option) => {
          const selected = multi ? !!values?.includes(option) : value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected }}
              onPress={() => (multi ? onToggle?.(option) : onSelect?.(option))}
              style={({ pressed, hovered, focused }: { pressed: boolean; hovered?: boolean; focused?: boolean }) => [
                styles.optionPill,
                selected ? styles.optionPillSelected : null,
                hovered ? styles.optionPillHover : null,
                focused ? styles.optionPillFocus : null,
                pressed ? { opacity: 0.82 } : null,
              ]}
            >
              <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBlock: { gap: spacing.sm, marginBottom: spacing.xs },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressStep: { fontFamily: fonts.bodySemibold, fontSize: 12, letterSpacing: 0.6, color: colors.textSecondary },
  progressPct: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.primary },
  progressTrack: {
    height: 8,
    width: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  loadingCard: {
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    padding: spacing.xl,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(177,132,61,0.28)',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(177,132,61,0.08)',
    padding: spacing.lg,
  },
  errorCardText: { ...type.body, flex: 1 },
  bioInput: { minHeight: 140, textAlignVertical: 'top', paddingTop: spacing.md },
  error: { ...type.caption, color: colors.danger },
  back: {
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  backHover: { color: colors.primary },
  backPressed: { opacity: 0.72 },
  backDisabled: { opacity: 0.45 },
  review: { gap: spacing.md },
  reviewRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    gap: 2,
  },
  reviewLabel: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  reviewValue: { ...type.body },
  reviewValueMultiline: { lineHeight: 21 },
  optionGroup: { gap: spacing.sm },
  optionLabel: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgElevated,
  },
  optionPillSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  optionPillHover: { borderColor: colors.borderStrong },
  optionPillFocus: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 8 },
  optionText: { ...type.caption, color: colors.textSecondary },
  optionTextSelected: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  rejectedNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(214,69,80,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214,69,80,0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rejectedText: { ...type.caption, color: colors.danger, flex: 1 },
  doneBadge: { alignItems: 'center', marginBottom: spacing.md },
  photoStep: { alignItems: 'center', gap: spacing.lg },
  photoPreview: { width: 128, height: 128, borderRadius: 64 },
  photoEmpty: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
