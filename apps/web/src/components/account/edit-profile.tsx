'use client';

import { MAX_BIO_CHARS } from '@heartlink/consumer-content';
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
import { useMyProfile, useUpdateMyProfile, useUploadMyProfilePhoto } from '@/lib/queries';
import { cn } from '@/lib/utils';

/**
 * Edit an approved profile one field at a time.
 *
 * The nine sign-up questions still make sense the first time; changing one
 * detail afterwards does not, so each row opens a dialog for just that field
 * rather than sending someone back through onboarding. The preference
 * questions, which only read as a set, still link there.
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
      await uploadPhoto.mutateAsync(file);
      toast.success('Photo updated', {
        description: 'It is visible to the people you write to.',
      });
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

  function open(key: FieldKey) {
    setDraft((profile?.[key] as string | null) ?? '');
    setError(null);
    setEditing(key);
  }

  async function save() {
    if (!editing) return;
    setError(null);
    try {
      await updateProfile.mutateAsync({ [editing]: draft.trim() });
      setEditing(null);
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

          <SettingsGroupLabel>Preferences</SettingsGroupLabel>
          <SettingsCard>
            <Link
              href="/onboarding"
              className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted"
            >
              <span className="min-w-0 flex-1 text-left text-[14.5px] text-ink">
                Interests, values and pace
              </span>
              <span className="shrink-0 text-[13px] text-ink-soft">Review</span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
            </Link>
          </SettingsCard>

          <p className="mt-7 px-1 text-[12.5px] leading-relaxed text-ink-faint">
            Changes are reviewed by our team before they appear to other members.
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
              {updateProfile.isPending ? 'Saving…' : 'Save'}
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
      <span className="min-w-0 flex-1 text-[14.5px] text-ink">{label}</span>
      <span className="min-w-0 shrink truncate text-[13px] text-ink-soft">{value}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
    </button>
  );
}
