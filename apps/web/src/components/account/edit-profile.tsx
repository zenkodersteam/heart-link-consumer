'use client';

import { needsReviewSubmission, type OutsideUserProfile } from '@heartlink/consumer-api';
import {
  MAX_BIO_CHARS,
  REVIEW_PREF_GROUPS,
  summarizePrefs,
  type PreferenceState,
} from '@heartlink/consumer-content';
import { PHOTO_ACCEPT, photoFileProblem } from '@heartlink/domain';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { ProfilePhoto } from '@/components/profiles/profile-photo';
import { SettingsCard, SettingsGroupLabel } from '@/components/account/settings-row';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  useMyProfile,
  useSubmitMyProfile,
  useUpdateMyProfile,
  useUploadMyProfilePhoto,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

/**
 * Edit an approved profile one field at a time.
 *
 * The nine sign-up questions still make sense the first time; changing one
 * detail afterwards does not, so each row opens a dialog for just that field
 * rather than sending someone back through onboarding. The preference
 * questions, which only read as a set, still link there.
 *
 * Saving also sends the profile for review. A save on its own only writes the
 * draft, which left the change sitting where nobody would see it while the page
 * promised it was being reviewed - and the only way to actually reach the queue
 * was to walk the whole sign-up flow again to its submit step.
 */

type FieldKey = 'displayName' | 'location' | 'bio';

const FIELDS: Record<
  FieldKey,
  { label: string; hint: string; placeholder: string; multiline?: boolean; max: number }
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
    // The shared limit, not a second number. This screen allowed 1200 while
    // onboarding stopped at 500, so a bio written here was over the limit the
    // moment it was edited on the other screen.
    max: MAX_BIO_CHARS,
  },
};

const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved',
  pending: 'In review',
  rejected: 'Needs changes',
};

export function EditProfile() {
  const { data: profile, isPending } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const submitProfile = useSubmitMyProfile();
  const uploadPhoto = useUploadMyProfilePhoto();
  const fileInput = useRef<HTMLInputElement>(null);

  async function onPickPhoto(file: File) {
    // Refused before the upload, so the answer names what to do instead of
    // handing back the MIME type the server rejected.
    const problem = photoFileProblem(file);
    if (problem) {
      toast.error('Could not upload that photo', { description: problem });
      return;
    }
    try {
      const saved = await uploadPhoto.mutateAsync(file);
      toast.success('Photo updated', {
        description: 'It is visible to the people you write to.',
      });
      // A new photo is a change like any other, and it is the one members are
      // most surprised to find waiting in a draft nobody looked at.
      await sendForReview(saved);
    } catch (err) {
      toast.error('Could not upload that photo', {
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
      });
    }
  }

  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const field = editing ? FIELDS[editing] : null;
  const statusLabel = STATUS_LABEL[profile?.status ?? ''] ?? 'Draft';
  // `matchPreferences` is `unknown` on the wire - the server stores whatever
  // the flow put there - so it is narrowed once, here, rather than at each row.
  const prefs = (profile?.matchPreferences ?? {}) as PreferenceState;

  function open(key: FieldKey) {
    setDraft((profile?.[key] as string | null) ?? '');
    setError(null);
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
      await submitProfile.mutateAsync();
      toast.success('Sent for review', {
        description: 'Our team looks at changes before they reach other members.',
      });
    } catch {
      toast.error('Saved, but not sent for review', {
        description: 'Your change is stored. Try saving again to send it to our team.',
      });
    }
  }

  async function save() {
    if (!editing) return;
    setError(null);
    try {
      const saved = await updateProfile.mutateAsync({ [editing]: draft.trim() });
      setEditing(null);
      await sendForReview(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not save that. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/account"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Account
      </Link>

      <div className="flex items-baseline gap-3">
        <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">Your profile</h1>
        <span className="text-sm text-ink-soft">{statusLabel}</span>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-4 rounded-[20px] border border-line bg-surface-elevated p-4">
            <span className="size-16 shrink-0 overflow-hidden rounded-full bg-surface-muted">
              {profile?.primaryPhotoUrl ? (
                <ProfilePhoto src={profile.primaryPhotoUrl} name={profile.displayName} sizes="160px" />
              ) : (
                <span className="grid size-full place-items-center font-[family-name:var(--font-bree)] text-2xl text-ink-faint">
                  {(profile?.displayName ?? '?').charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">Profile photo</p>
              <p className="text-[13px] text-ink-faint">
                {profile?.primaryPhotoUrl
                  ? 'Visible to people you write to.'
                  : 'No photo yet.'}
              </p>
            </div>
            {/*
              A real upload, not a link to `/onboarding`.
              Changing a photo used to mean walking the nine sign-up questions
              again — and for an approved member the gate sends them straight
              back out, so the button did nothing at all.
            */}
            <input
              ref={fileInput}
              type="file"
              accept={PHOTO_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Cleared here so choosing the same file twice still fires a
                // change event; without it a failed upload cannot be retried.
                event.target.value = '';
                if (file) void onPickPhoto(file);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={uploadPhoto.isPending}
              onClick={() => fileInput.current?.click()}
            >
              {uploadPhoto.isPending ? <Spinner size="sm" /> : null}
              {profile?.primaryPhotoUrl ? 'Change' : 'Add'}
            </Button>
          </div>

          <SettingsGroupLabel>Details</SettingsGroupLabel>
          <SettingsCard>
            <FieldRow
              label={FIELDS.displayName.label}
              value={profile?.displayName ?? 'Not set'}
              onClick={() => open('displayName')}
            />
            <FieldRow
              label={FIELDS.location.label}
              value={profile?.location ?? 'Not set'}
              onClick={() => open('location')}
            />
            <FieldRow
              label={FIELDS.bio.label}
              value={profile?.bio ? 'Written' : 'Not set'}
              onClick={() => open('bio')}
              last
            />
          </SettingsCard>

          {/* Four rows, not one link to the start of onboarding. These answers
              only read as a group, so they have no dialog here - but each one
              opens just its own step, saves, and comes back. One row saying
              "Review" that led to nine questions is what made changing a single
              answer feel like doing the whole sign-up again. */}
          <SettingsGroupLabel>Preferences</SettingsGroupLabel>
          <SettingsCard>
            {REVIEW_PREF_GROUPS.map((group, i) => (
              <Link
                key={group.step}
                href={`/onboarding?section=${group.step}`}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted',
                  i === REVIEW_PREF_GROUPS.length - 1 ? null : 'border-b border-line',
                )}
              >
                {/* The label never gives up width; the value takes what is
                    left and truncates. It was the other way round — a
                    shrinkable label beside a value sized to its own text — so
                    the longest summaries (Lifestyle, Communication) squeezed
                    the label to nothing and it printed underneath them. */}
                <span className="shrink-0 text-left text-[14.5px] text-ink">
                  {group.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-[13px] text-ink-soft">
                  {summarizePrefs(prefs, group.keys)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </Link>
            ))}
          </SettingsCard>

          <p className="mt-7 px-1 text-[12.5px] leading-relaxed text-ink-faint">
            Saving a change sends your profile to our team. They review it before
            it reaches other members, usually within a day.
          </p>
        </>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next && !updateProfile.isPending) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{field?.label}</DialogTitle>
          <DialogDescription>{field?.hint}</DialogDescription>

          {field?.multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.max}
              rows={7}
              autoFocus
              className="mt-4 w-full resize-y rounded-[14px] border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={field?.placeholder}
              maxLength={field?.max}
              autoFocus
              className="mt-4 h-12 w-full rounded-[14px] border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          )}

          {field ? (
            <p
              className={cn(
                'mt-1.5 text-right text-[12px]',
                draft.length >= field.max ? 'text-danger' : 'text-ink-faint',
              )}
            >
              {draft.length} / {field.max}
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-3">
            <Button
              variant="ghost"
              disabled={updateProfile.isPending}
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button disabled={updateProfile.isPending} onClick={() => void save()}>
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldRow({
  label,
  value,
  onClick,
  last,
}: {
  label: string;
  value: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted',
        last ? null : 'border-b border-line',
      )}
    >
      {/* Same rule as the preference rows: the label keeps its width and the
          value truncates, so a long location cannot run under "Location". */}
      <span className="shrink-0 text-[14.5px] text-ink">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[13px] text-ink-soft">{value}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
    </button>
  );
}
