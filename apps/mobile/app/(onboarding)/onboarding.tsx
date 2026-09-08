import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { AuthShell } from '../../src/components/AuthShell';
import { Button, Field } from '../../src/components/primitives';
import { ApiClientError, type UpdateOutsideProfileInput } from '@heartlink/consumer-api';
import { takePendingRoute } from '../../src/lib/pending-route';
import { useToast } from '../../src/components/Toast';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { useMyProfile } from '../../src/lib/use-my-profile';
import { ProfilePhoto } from '../../src/components/ProfilePhoto';
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

type PickedPhoto = { blob: Blob; name: string };

/** Hidden file input, the only way to reach the file system on web. */
function pickWebImage(): Promise<PickedPhoto | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => {
      const f = input.files?.[0];
      resolve(f ? { blob: f, name: f.name } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Camera / library picker for iOS and Android.
 *
 * This used to return null on native, with the UI saying upload was web-only —
 * a leftover from when native was going to be a separate Flutter app. The
 * upload endpoint wants multipart form data, so the picked asset's `file://`
 * uri is fetched into a real Blob. Permissions are asked for at the moment of
 * use, so the OS prompt arrives with the reason on screen.
 */
async function pickNativeImage(source: 'library' | 'camera'): Promise<PickedPhoto | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      source === 'camera'
        ? 'Camera access is off. Turn it on in Settings to take a photo.'
        : 'Photo access is off. Turn it on in Settings to choose a photo.',
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.85,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;
  const res = await fetch(asset.uri);
  return { blob: await res.blob(), name: asset.fileName ?? `photo-${Date.now()}.jpg` };
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

/**
 * Auto-insert the slashes while a date is typed, and refuse a date that could
 * never exist as it is being typed.
 *
 * Clamping matters more than it looks. Without it "32/06/44" sits on screen
 * looking like a date until Continue answers "Enter your birth date as
 * MM/DD/YYYY" — which is no help at all, because what you typed already looks
 * like MM/DD/YYYY. Refusing the impossible digit as it arrives means the field
 * can only ever show something that reads as a real date.
 *
 * A first month digit above 1 can only mean a single-digit month, so 3 becomes
 * 03 and the field moves on — the behaviour every date mask has, and the one
 * that lets someone type 3 1 1 9 9 0 for March 1990.
 */
function formatDobInput(raw: string): string {
  const typed = raw.replace(/\D/g, '').slice(0, 8);
  if (!typed) return '';

  // How many of the typed digits the month actually used. A leading 2-9 can
  // only mean a single-digit month, so it consumes one digit and becomes two
  // characters — which is what lets someone type 3 1 1 9 9 0 for 1 March 1990.
  let monthDigits = typed.slice(0, 2);
  let used = monthDigits.length;
  if (monthDigits.length >= 1 && monthDigits[0] > '1') {
    monthDigits = `0${monthDigits[0]}`;
    used = 1;
  } else if (monthDigits.length === 2) {
    const value = Number(monthDigits);
    if (value === 0) monthDigits = '01';
    else if (value > 12) monthDigits = '12';
  }
  if (monthDigits.length < 2) return monthDigits;

  const afterMonth = typed.slice(used);
  if (!afterMonth.length) return `${monthDigits}/`;

  let dayDigits = afterMonth.slice(0, 2);
  let usedDay = dayDigits.length;
  // Likewise a leading 4-9 can only be a single-digit day.
  if (dayDigits[0] > '3') {
    dayDigits = `0${dayDigits[0]}`;
    usedDay = 1;
  } else if (dayDigits.length === 2) {
    const value = Number(dayDigits);
    if (value === 0) dayDigits = '01';
    else if (value > 31) dayDigits = '31';
  }
  if (dayDigits.length < 2) return `${monthDigits}/${dayDigits}`;

  const year = afterMonth.slice(usedDay, usedDay + 4);
  return year.length ? `${monthDigits}/${dayDigits}/${year}` : `${monthDigits}/${dayDigits}/`;
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
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  /**
   * Whether to actually show the button's loading state.
   *
   * Each step PUTs a draft, which usually returns in well under a tenth of a
   * second. Binding the spinner straight to `saving` made Continue flash pale
   * and spin on every one of the nine steps — the only thing in the flow that
   * visibly moved, and it read as jank rather than progress. Hold the spinner
   * back so a quick save shows nothing at all, and it only appears when the
   * request is genuinely slow enough to need explaining.
   */
  const [savingVisible, setSavingVisible] = useState(false);
  useEffect(() => {
    if (!saving) {
      setSavingVisible(false);
      return;
    }
    const t = setTimeout(() => setSavingVisible(true), 400);
    return () => clearTimeout(t);
  }, [saving]);
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

  async function onPickPhoto(source: 'web' | 'library' | 'camera') {
    try {
      const picked = source === 'web' ? await pickWebImage() : await pickNativeImage(source);
      // Cancelling the sheet is a normal outcome, not an error.
      if (!picked) return;
      setUploadingPhoto(true);
      const api = await apiFactory();
      const updated = await api.uploadMyProfilePhoto(picked.blob, picked.name);
      apply(updated);
    } catch (e) {
      // A denied permission throws with copy worth showing verbatim.
      toast.error(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not upload the photo.',
      );
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
      toast.error(message);
      return;
    }
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
      toast.error(e instanceof ApiClientError ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthShell
        title="Preparing your profile"
        subtitle="Loading your saved onboarding answers."
        compact
        minimal
        staticEntrance
      >
        <View style={styles.loadingCard} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.primary} />
          <Text style={type.caption}>One moment...</Text>
        </View>
      </AuthShell>
    );
  }

  if (profileLoadError) {
    return (
      <AuthShell
        title="We couldn't load onboarding"
        subtitle="Your profile answers are safe. Try again when the connection settles."
        compact
        minimal
        staticEntrance
      >
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
        compact
        minimal
        staticEntrance
      >
        <View style={styles.doneBadge}>
          <Feather name="check-circle" size={40} color={colors.success} />
        </View>
        <Button
          label="Start browsing"
          onPress={() => {
            void takePendingRoute().then((route) => router.replace((route as never) ?? '/(tabs)'));
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step.title}
      subtitle={step.subtitle}
      compact
      minimal
      staticEntrance
      stickyHeader={
        // Pinned with the title. Scrolling a long step used to carry the
        // question and the progress off screen together.
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
      }
    >
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
            }}
            placeholder="First name and last initial, e.g. Maria C."
            autoComplete="name"
          />
          <Field
            label="Date of birth"
            value={dob}
            onChangeText={(t) => {
              setDobText(formatDobInput(t));
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
          {/* A round avatar with a camera badge, which is what a profile photo
              control looks like nearly everywhere. The tall rectangle read as
              an empty content slab waiting to be filled. */}
          <View style={styles.avatarWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={profile?.primaryPhotoUrl ? 'Change your photo' : 'Add a photo'}
              disabled={uploadingPhoto}
              onPress={() => onPickPhoto(Platform.OS === 'web' ? 'web' : 'library')}
              style={({ pressed }: { pressed: boolean }) => [styles.avatar, pressed ? { opacity: 0.9 } : null]}
            >
              {profile?.primaryPhotoUrl ? (
                <ProfilePhoto
                  uri={profile.primaryPhotoUrl}
                  name={profile.displayName}
                  style={styles.avatarImg}
                  priority="high"
                  showCaption={false}
                />
              ) : (
                <View style={styles.avatarEmpty}>
                  <Feather name="user" size={44} color={colors.gold} />
                </View>
              )}
              {uploadingPhoto ? (
                <View style={styles.avatarUploading}>
                  <ActivityIndicator color={colors.onPrimary} />
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a photo"
              disabled={uploadingPhoto}
              onPress={() => onPickPhoto(Platform.OS === 'web' ? 'web' : 'library')}
              style={({ pressed }: { pressed: boolean }) => [styles.avatarFab, pressed ? { opacity: 0.85 } : null]}
            >
              <Feather name={profile?.primaryPhotoUrl ? 'edit-2' : 'plus'} size={16} color={colors.onPrimary} />
            </Pressable>
          </View>

          <Text style={styles.photoCaption}>
            {profile?.primaryPhotoUrl ? 'Looking good. You can change it any time.' : 'Optional — add one now or later from Account.'}
          </Text>

          {Platform.OS !== 'web' ? (
            <View style={styles.photoActions}>
              <Pressable
                accessibilityRole="button"
                disabled={uploadingPhoto}
                onPress={() => onPickPhoto('camera')}
                style={({ pressed }: { pressed: boolean }) => [styles.photoAction, pressed ? { opacity: 0.7 } : null]}
              >
                <Feather name="camera" size={15} color={colors.primary} />
                <Text style={styles.photoActionText}>Camera</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={uploadingPhoto}
                onPress={() => onPickPhoto('library')}
                style={({ pressed }: { pressed: boolean }) => [styles.photoAction, pressed ? { opacity: 0.7 } : null]}
              >
                <Feather name="image" size={15} color={colors.primary} />
                <Text style={styles.photoActionText}>Gallery</Text>
              </Pressable>
            </View>
          ) : null}
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

      <Button
        label={step.key === 'review' ? 'Submit for review' : 'Continue'}
        onPress={onNext}
        loading={savingVisible}
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
      <View style={styles.optionHead}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionHint}>{multi ? 'Choose any' : 'Choose one'}</Text>
      </View>
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
              {multi && selected ? <Feather name="check" size={12} color={colors.onPrimary} /> : null}
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
  // Each question is its own card. As a bare label plus loose pills, three
  // questions ran together as one wall of chips with nothing marking where one
  // ended and the next began.
  optionGroup: {
    gap: spacing.md,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  optionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  optionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  // Says whether the question takes one answer or several, which the chips
  // alone never communicated.
  optionHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    // White on the tinted card, so an unpicked chip still reads as a control.
    backgroundColor: colors.bgElevated,
  },
  // Filled rather than tinted: a soft pink wash on a warm background sat too
  // close to the unselected state to scan at a glance.
  optionPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(219, 2, 82, 0.28)' } as object,
      default: {
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      },
    }),
  },
  optionPillHover: { borderColor: colors.borderStrong },
  optionPillFocus: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 8 },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.textSecondary },
  optionTextSelected: { color: colors.onPrimary, fontFamily: fonts.bodySemibold },
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
  photoStep: { alignItems: 'center', gap: spacing.md },
  avatarWrap: { width: 148, height: 148 },
  avatar: {
    width: 148,
    height: 148,
    borderRadius: 74,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldFaint },
  avatarUploading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFab: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bgElevated,
  },
  photoCaption: { ...type.caption, textAlign: 'center' },
  photoActions: { flexDirection: 'row', gap: spacing.sm },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  photoActionText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.primary },
});
