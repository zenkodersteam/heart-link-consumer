'use client';

import { ApiClientError, type UpdateOutsideProfileInput } from '@heartlink/consumer-api';
import {
  ONBOARDING_OPTIONS,
  ONBOARDING_STEPS,
  MIN_BIO_CHARS,
  REVIEW_PREF_GROUPS,
  isoToDisplay,
  parseDob,
  summarizePrefs,
  validateStep,
  type PrefKey,
  type PreferenceState,
} from '@heartlink/consumer-content';
import { AlertCircle, CheckCircle2, LogOut, Pencil, Plus, User, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { OptionGroup } from '@/components/onboarding/option-group';
import { ProfilePhoto } from '@/components/profiles/profile-photo';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/auth/session-provider';
import { DateField } from '@/components/ui/date-field';
import { Field, TextareaField } from '@/components/ui/field';
import { PageSpinner } from '@/components/ui/spinner';
import { AFTER_SIGN_IN } from '@/lib/routes';
import {
  useMyProfile,
  useSubmitMyProfile,
  useUpdateMyProfile,
  useUploadMyProfilePhoto,
} from '@/lib/queries';

/**
 * Post-signup onboarding for the website.
 *
 * The step list, option vocabulary and validation rules come from
 * `@heartlink/consumer-content` so this asks exactly the same questions, in the
 * same order, as the phone app. Only the rendering is local.
 *
 * Each step PUTs a draft before advancing, so someone who closes the tab on
 * step six comes back to step six's answers rather than an empty form. The last
 * step submits for moderation.
 */
export function Onboarding() {
  const router = useRouter();
  const { signOut } = useSession();
  const { data: profile, isPending, isError, error, refetch } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const submitProfile = useSubmitMyProfile();
  const uploadPhoto = useUploadMyProfilePhoto();

  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [dobText, setDobText] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState<string | null>(null);
  const [prefEdits, setPrefEdits] = useState<PreferenceState | null>(null);
  /**
   * Per-field problems for the step on screen, shown under the field each is
   * about. It used to be one sentence under the whole form, which meant looking
   * away from the box that needed fixing to find out what was wrong with it.
   */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Drop a field's message as soon as it is being retyped. */
  function clearField(field: string) {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  /**
   * The saved draft's preferences, until this session edits them.
   *
   * Derived rather than copied into state by an effect: `prefEdits` stays null
   * while nobody has touched a pill, so the server's answers show through, and
   * the first edit takes over wholesale. That distinction matters — someone who
   * deliberately clears every pill on a step leaves an empty object, not null,
   * and must not have the server's answers pushed back at them.
   */
  const savedPrefs = profile?.matchPreferences;
  const serverPrefs: PreferenceState =
    savedPrefs && typeof savedPrefs === 'object' && !Array.isArray(savedPrefs)
      ? (savedPrefs as PreferenceState)
      : {};
  const preferences = prefEdits ?? serverPrefs;

  /** Edits always start from whatever is currently on screen. */
  function editPrefs(update: (current: PreferenceState) => PreferenceState) {
    setPrefEdits((prev) => update(prev ?? serverPrefs));
  }

  // Local edits win over the server draft; null means "untouched here".
  const name = displayName ?? profile?.displayName ?? '';
  const dob = dobText ?? isoToDisplay(profile?.dateOfBirth ?? null);
  const loc = location ?? profile?.location ?? '';
  const story = bio ?? profile?.bio ?? '';
  const looking = lookingFor ?? ((preferences.lookingFor as string | undefined) ?? '');

  const step = ONBOARDING_STEPS[stepIndex];
  const draft = { name, dob, location: loc, story, lookingFor: looking };
  const blocker = validateStep(step.key, draft);
  const stepReady = Object.keys(blocker).length === 0;
  const isLastStep = step.key === 'review';
  const saving = updateProfile.isPending || submitProfile.isPending;

  /**
   * Move focus to the new question when the step changes.
   *
   * Without this the page silently swaps its contents and a screen reader stays
   * announcing the old step, while a keyboard user's focus falls back to the
   * top of the document.
   */
  useEffect(() => {
    if (stepIndex > 0) headingRef.current?.focus();
  }, [stepIndex]);

  function setSinglePref(key: PrefKey, value: string) {
    editPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMultiPref(key: PrefKey, value: string) {
    editPrefs((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setSaveError(null);
    try {
      await uploadPhoto.mutateAsync(file);
    } catch (e) {
      setSaveError(
        e instanceof ApiClientError || e instanceof Error
          ? e.message
          : 'Could not upload the photo.',
      );
    }
  }

  async function onNext() {
    if (!stepReady) {
      setFieldErrors(blocker);
      return;
    }
    setFieldErrors({});
    setSaveError(null);

    const save = (input: UpdateOutsideProfileInput) => updateProfile.mutateAsync(input);

    try {
      switch (step.key) {
        case 'name':
          await save({ displayName: name.trim(), dateOfBirth: parseDob(dob) ?? undefined });
          break;
        case 'location':
          await save({ location: loc.trim() });
          break;
        case 'identity':
        case 'connection':
        case 'lifestyle':
        case 'communication':
          await save({ matchPreferences: preferences });
          break;
        case 'story':
          await save({
            bio: story.trim(),
            matchPreferences: { ...preferences, lookingFor: looking.trim() },
          });
          break;
        case 'photo':
          // Optional step — the upload already happened in place.
          break;
        case 'review':
          await submitProfile.mutateAsync();
          setDone(true);
          return;
      }
      setStepIndex((i) => i + 1);
    } catch (e) {
      setSaveError(
        e instanceof ApiClientError ? e.message : 'Could not save. Please try again.',
      );
    }
  }

  // Inside the shell, so the artwork and the form column are already in place
  // rather than snapping in once the draft lands.
  if (isPending) {
    return (
      <Shell>
        <PageSpinner label="Loading your saved answers…" />
      </Shell>
    );
  }

  if (isError) {
    return (
      <Shell>
        <div
          className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-elevated p-8 text-center"
          role="alert"
        >
          <WifiOff className="size-6 text-gold" aria-hidden />
          <h1 className="font-[family-name:var(--font-bree)] text-xl text-ink">
            We couldn&apos;t load onboarding
          </h1>
          <p className="max-w-sm text-sm text-ink-soft">
            Your answers are safe. {error instanceof Error ? error.message : ''} Try again when the
            connection settles.
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface-elevated p-10 text-center">
          <CheckCircle2 className="size-11 text-success" aria-hidden />
          <h1 className="font-[family-name:var(--font-bree)] text-2xl text-ink">You&apos;re all set</h1>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Your profile is in review. You can start browsing now, and letters unlock the moment
            you&apos;re approved.
          </p>
          <Button onClick={() => router.push(AFTER_SIGN_IN)}>Start browsing</Button>
        </div>
      </Shell>
    );
  }

  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <Shell>
      <div className="sticky top-0 z-10 -mx-6 mb-7 bg-surface-elevated px-6 pb-3 pt-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold tracking-wide text-ink-soft">
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold text-primary">{Math.round(progress)}%</span>
            {/* The only control on these screens was Continue. Someone who
                signed in as the wrong person, or simply wants to stop, had no
                way out short of clearing the session by hand. */}
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label="Onboarding progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-[family-name:var(--font-bree)] text-[26px] leading-tight text-ink outline-none"
      >
        {step.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.subtitle}</p>

      {profile?.status === 'rejected' && profile.moderationNotes ? (
        <div
          className="mt-5 flex gap-2.5 rounded-[14px] border border-danger/30 bg-danger/5 p-3.5"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink">
            Your last submission needed changes: {profile.moderationNotes}
          </p>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-6">
        {step.key === 'name' ? (
          <>
            <Field
              label="Your name"
              value={name}
              error={fieldErrors.name}
              onChange={(e) => {
                setDisplayName(e.target.value);
                clearField('name');
              }}
              placeholder="First name and last initial, e.g. Maria C."
              autoComplete="name"
            />
            <DateField
              label="Date of birth"
              value={dob}
              error={fieldErrors.dob}
              onChange={(next) => {
                setDobText(next);
                clearField('dob');
              }}
              hint="You must be 18 or older. Your birth date is never shown to anyone."
            />
          </>
        ) : null}

        {step.key === 'location' ? (
          <Field
            label="City and state"
            value={loc}
            error={fieldErrors.location}
            onChange={(e) => {
              setLocation(e.target.value);
              clearField('location');
            }}
            placeholder="Atlanta, GA"
            autoComplete="address-level2"
          />
        ) : null}

        {step.key === 'identity' ? (
          <>
            <OptionGroup
              label="I am"
              options={ONBOARDING_OPTIONS.iAm}
              value={preferences.iAm as string | undefined}
              onSelect={(v) => setSinglePref('iAm', v)}
            />
            <OptionGroup
              label="Religion"
              options={ONBOARDING_OPTIONS.religion}
              value={preferences.religion as string | undefined}
              onSelect={(v) => setSinglePref('religion', v)}
            />
            <OptionGroup
              label="Interested in"
              options={ONBOARDING_OPTIONS.interestedIn}
              values={preferences.interestedIn as string[] | undefined}
              onToggle={(v) => toggleMultiPref('interestedIn', v)}
              multi
            />
          </>
        ) : null}

        {step.key === 'connection' ? (
          <>
            <OptionGroup
              label="Type of connection"
              options={ONBOARDING_OPTIONS.connectionTypes}
              values={preferences.connectionTypes as string[] | undefined}
              onToggle={(v) => toggleMultiPref('connectionTypes', v)}
              multi
            />
            <OptionGroup
              label="Relationship pace"
              options={ONBOARDING_OPTIONS.relationshipPace}
              value={preferences.relationshipPace as string | undefined}
              onSelect={(v) => setSinglePref('relationshipPace', v)}
            />
            <OptionGroup
              label="Future expectations"
              options={ONBOARDING_OPTIONS.futureExpectations}
              value={preferences.futureExpectations as string | undefined}
              onSelect={(v) => setSinglePref('futureExpectations', v)}
            />
          </>
        ) : null}

        {step.key === 'lifestyle' ? (
          <>
            <OptionGroup
              label="Values & lifestyle"
              options={ONBOARDING_OPTIONS.values}
              values={preferences.values as string[] | undefined}
              onToggle={(v) => toggleMultiPref('values', v)}
              multi
            />
            <OptionGroup
              label="Interests"
              options={ONBOARDING_OPTIONS.interests}
              values={preferences.interests as string[] | undefined}
              onToggle={(v) => toggleMultiPref('interests', v)}
              multi
            />
            <OptionGroup
              label="Highest education"
              options={ONBOARDING_OPTIONS.education}
              value={preferences.education as string | undefined}
              onSelect={(v) => setSinglePref('education', v)}
            />
            <OptionGroup
              label="Exercise"
              options={ONBOARDING_OPTIONS.exercise}
              value={preferences.exercise as string | undefined}
              onSelect={(v) => setSinglePref('exercise', v)}
            />
            <OptionGroup
              label="Languages spoken"
              options={ONBOARDING_OPTIONS.languages}
              values={preferences.languages as string[] | undefined}
              onToggle={(v) => toggleMultiPref('languages', v)}
              multi
            />
            <OptionGroup
              label="Tattoos"
              options={ONBOARDING_OPTIONS.tattoos}
              value={preferences.tattoos as string | undefined}
              onSelect={(v) => setSinglePref('tattoos', v)}
            />
            <OptionGroup
              label="Kids"
              options={ONBOARDING_OPTIONS.kids}
              value={preferences.kids as string | undefined}
              onSelect={(v) => setSinglePref('kids', v)}
            />
            <OptionGroup
              label="Political views"
              options={ONBOARDING_OPTIONS.politicalViews}
              value={preferences.politicalViews as string | undefined}
              onSelect={(v) => setSinglePref('politicalViews', v)}
            />
          </>
        ) : null}

        {step.key === 'communication' ? (
          <>
            <OptionGroup
              label="Communication channels"
              options={ONBOARDING_OPTIONS.communicationChannels}
              values={preferences.communicationChannels as string[] | undefined}
              onToggle={(v) => toggleMultiPref('communicationChannels', v)}
              multi
            />
            <OptionGroup
              label="Communication pace"
              options={ONBOARDING_OPTIONS.communicationPace}
              value={preferences.communicationPace as string | undefined}
              onSelect={(v) => setSinglePref('communicationPace', v)}
            />
            <OptionGroup
              label="Emotional intentions"
              options={ONBOARDING_OPTIONS.emotionalIntentions}
              values={preferences.emotionalIntentions as string[] | undefined}
              onToggle={(v) => toggleMultiPref('emotionalIntentions', v)}
              multi
            />
            <OptionGroup
              label="Love language"
              options={ONBOARDING_OPTIONS.loveLanguage}
              value={preferences.loveLanguage as string | undefined}
              onSelect={(v) => setSinglePref('loveLanguage', v)}
            />
          </>
        ) : null}

        {step.key === 'story' ? (
          <>
            <TextareaField
              label="About you"
              value={story}
              error={fieldErrors.story}
              rows={6}
              onChange={(e) => {
                setBio(e.target.value);
                clearField('story');
              }}
              placeholder="What brings you here? What kind of connection are you hoping for?"
              hint={
                story.trim().length < MIN_BIO_CHARS
                  ? `${MIN_BIO_CHARS - story.trim().length} more characters to go`
                  : 'Looking good.'
              }
            />
            <TextareaField
              label="What I'm looking for"
              value={looking}
              error={fieldErrors.lookingFor}
              rows={5}
              onChange={(e) => {
                const next = e.target.value;
                setLookingFor(next);
                editPrefs((prev) => ({ ...prev, lookingFor: next }));
                clearField('lookingFor');
              }}
              placeholder="What kind of correspondence or connection would feel meaningful to you?"
              hint={
                looking.trim().length < MIN_BIO_CHARS
                  ? `${MIN_BIO_CHARS - looking.trim().length} more characters to go`
                  : 'This gives people a clearer reason to write back.'
              }
            />
          </>
        ) : null}

        {step.key === 'photo' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <button
                type="button"
                disabled={uploadPhoto.isPending}
                onClick={() => fileInputRef.current?.click()}
                aria-label={profile?.primaryPhotoUrl ? 'Change your photo' : 'Add a photo'}
                className="grid size-36 place-items-center overflow-hidden rounded-full border border-line bg-surface-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
              >
                {profile?.primaryPhotoUrl ? (
                  <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName ?? ''} />
                ) : (
                  <User className="size-11 text-gold" aria-hidden />
                )}
              </button>
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-1 right-1 grid size-9 place-items-center rounded-full bg-primary text-on-primary shadow-md"
              >
                {profile?.primaryPhotoUrl ? (
                  <Pencil className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                void onPickPhoto(e.target.files?.[0]);
                // Clear it, or re-picking the same file fires no change event.
                e.target.value = '';
              }}
            />

            <p className="text-[13px] text-ink-faint">
              {uploadPhoto.isPending
                ? 'Uploading…'
                : profile?.primaryPhotoUrl
                  ? 'Looking good. You can change it any time.'
                  : 'Optional — add one now or later from Account.'}
            </p>
          </div>
        ) : null}

        {step.key === 'review' ? (
          <dl className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-elevated">
            <ReviewRow label="Name" value={name} />
            <ReviewRow label="Birth date" value={dob} />
            <ReviewRow label="Location" value={loc} />
            {REVIEW_PREF_GROUPS.map((group) => (
              <ReviewRow
                key={group.label}
                label={group.label}
                value={summarizePrefs(preferences, group.keys)}
              />
            ))}
            <ReviewRow label="About you" value={story} />
            <ReviewRow label="What I'm looking for" value={looking} />
          </dl>
        ) : null}
      </div>

      {saveError ? (
        <p className="mt-5 text-[13px] text-danger" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <Button
          onClick={() => void onNext()}
          // The review step submits whatever the earlier steps accepted, so it
          // is never itself blocked.
          //
          // `stepReady`, not `blocker !== null`: `validateStep` returns a map of
          // problems, and an object is never null — so that test was true on
          // every step and Continue stayed disabled no matter what was typed.
          disabled={saving || (!isLastStep && !stepReady)}
        >
          {saving ? 'Saving…' : isLastStep ? 'Submit for review' : 'Continue'}
        </Button>
        {stepIndex > 0 ? (
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setFieldErrors({});
              setSaveError(null);
              setStepIndex((i) => i - 1);
            }}
          >
            Back
          </Button>
        ) : null}
        {/* A way out for someone who has been through this before — landing
            back on step one after editing a finished profile left no exit but
            re-answering nine screens. Only offered once the profile has been
            submitted: a genuine first-timer skipping would enter the app with
            nothing filled in, which is what the gate is there to prevent. */}
        {profile?.onboardingComplete ? (
          <Button variant="ghost" disabled={saving} onClick={() => router.push(AFTER_SIGN_IN)}>
            Skip — I&apos;ve done this already
          </Button>
        ) : null}
      </div>
    </Shell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3">
      <dt className="text-[13px] text-ink-faint">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-[13px] text-ink">{value || '—'}</dd>
    </div>
  );
}

/**
 * The same split layout as sign-in — artwork left, form right — so finishing a
 * profile feels like the last step of joining rather than a different product.
 * `wide` because the lifestyle step lays out eight groups of choice pills.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return <AuthShell wide>{children}</AuthShell>;
}
