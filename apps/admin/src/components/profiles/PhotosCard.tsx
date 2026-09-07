'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Camera, Check, Download, Star, Trash2, X } from 'lucide-react';
import type { ProfileDetail, ProfilePhoto } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuIconTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  StatusBadge,
  type StatusBadgeVariant,
} from '../ui/StatusBadge';
import { useRef } from 'react';
import {
  moderatePhoto,
  setPrimaryPhoto,
  deletePhoto,
  uploadPhoto,
  importIntakePhotos,
} from '../../lib/actions';

const PHOTO_STATUS_VARIANT: Record<ProfilePhoto['moderationStatus'], StatusBadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function PhotosCard({
  detail,
  photos,
  requiredCount,
}: {
  detail: ProfileDetail;
  photos: ProfilePhoto[];
  requiredCount: number | null;
}) {
  const approvedCount = photos.filter((p) => p.moderationStatus === 'approved').length;
  const labelTotal = requiredCount ?? photos.length;
  const intake = detail.photoIntake;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5">
      {/* Wraps: a title plus two buttons is more than a 360px column holds on
          one line, and forcing it there squeezed the buttons into the edge. */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="font-serif text-base leading-6 text-text">
          Photos ({approvedCount}/{labelTotal})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {intake && intake.intakePhotoDocumentCount > 0 && (
            <ImportIntakePhotosControl profileId={detail.id} count={intake.intakePhotoDocumentCount} />
          )}
          <UploadPhotoControl profileId={detail.id} />
        </div>
      </header>
      {intake && (
        <div className="rounded-md border border-border bg-surface p-3 text-[13px] leading-5 text-text">
          <div className="font-medium text-text">Photo intake tracking</div>
          <div className="mt-1 text-text-muted">
            Method: <span className="text-text">{formatMethod(intake.submissionMethod)}</span>
            {typeof intake.expectedAttachedCount === 'number' ? ` · Expected attached: ${intake.expectedAttachedCount}` : ''}
            {intake.selectedPhotoNumbers.length ? ` · Numbered photos: ${intake.selectedPhotoNumbers.join(', ')}` : ''}
          </div>
          <div className="mt-1 text-text-muted">
            Intake photo docs: <span className="text-text">{intake.intakePhotoDocumentCount}</span> · Profile photos: <span className="text-text">{intake.profilePhotoCount}</span> · Approved: <span className="text-text">{intake.approvedPhotoCount}</span>
          </div>
        </div>
      )}
      {/* Photos are listed one per row, not three across. This card lives in a
          360px column, so three columns left each photo about 110px wide — too
          small to judge a photo by, and too narrow for its own buttons, which
          wrapped onto three lines each. A row gives the thumbnail a sensible
          size and puts the actions beside it. */}
      {photos.length === 0 ? (
        <div className="flex h-[140px] items-center justify-center rounded-md border border-dashed border-border text-sm text-text-muted">
          No photos uploaded yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              profileId={detail.id}
              photo={photo}
              isPrimary={detail.primaryPhotoId === photo.documentId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ImportIntakePhotosControl({
  profileId,
  count,
}: {
  profileId: string;
  count: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await importIntakePhotos(profileId);
            toast.success(
              result.imported > 0
                ? `Imported ${result.imported} intake photo${result.imported === 1 ? '' : 's'}`
                : 'No new intake photos to import',
            );
          } catch (err) {
            toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        })
      }
    >
      <Download className="size-3.5" />
      {isPending ? 'Importing…' : `Import intake (${count})`}
    </Button>
  );
}

function UploadPhotoControl({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('profileId', profileId);
    fd.append('file', file);
    startTransition(async () => {
      try {
        await uploadPhoto(fd);
        toast.success('Photo uploaded');
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
      <Button
        variant="primary"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? 'Uploading…' : '+ Upload'}
      </Button>
    </>
  );
}

function PhotoTile({
  profileId,
  photo,
  isPrimary,
}: {
  profileId: string;
  photo: ProfilePhoto;
  isPrimary: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Per tile: one photo failing to load must not blank the others.
  const [failed, setFailed] = useState(false);

  const onApprove = () =>
    startTransition(async () => {
      try {
        await moderatePhoto({ profileId, photoId: photo.id, status: 'approved' });
        toast.success('Photo approved');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  const onReject = () =>
    startTransition(async () => {
      try {
        await moderatePhoto({ profileId, photoId: photo.id, status: 'rejected' });
        toast.success('Photo rejected');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  const onSetPrimary = () =>
    startTransition(async () => {
      try {
        await setPrimaryPhoto({ profileId, photoId: photo.id });
        toast.success('Set as primary');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  const onDelete = () =>
    startTransition(async () => {
      try {
        await deletePhoto({ profileId, photoId: photo.id });
        toast.success('Photo deleted');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-surface/40 p-2',
        isPending && 'opacity-60',
      )}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        {photo.presignedUrl && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.presignedUrl}
            alt=""
            // A file that will not load falls back to the same placeholder as a
            // photo that was never uploaded. Without this the browser draws its
            // own broken-image glyph with the alt text beside it, which reads as
            // the whole screen being broken rather than one picture missing.
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <Camera className="size-6" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-text">
            {isPrimary ? 'Primary' : `Photo ${photo.sortOrder + 1}`}
          </span>
          <StatusBadge
            status={photo.moderationStatus}
            variantMap={PHOTO_STATUS_VARIANT}
            size="sm"
          />
        </div>
        {failed ? (
          <span className="text-[11px] text-danger">This picture could not be loaded</span>
        ) : null}
        {/* Approve stays on the row: it is the one thing a reviewer is here to
            do, and burying the common action behind a menu costs a click every
            time. The rest are occasional, so they go in the menu. */}
        {photo.moderationStatus !== 'approved' && (
          <div className="flex items-center gap-1.5">
            <Button variant="success" size="xs" onClick={onApprove} disabled={isPending}>
              Approve
            </Button>
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuIconTrigger label={`Actions for ${isPrimary ? 'the primary photo' : `photo ${photo.sortOrder + 1}`}`} />
        <DropdownMenuContent>
          {photo.moderationStatus === 'approved' && !isPrimary && (
            <DropdownMenuItem onSelect={onSetPrimary} disabled={isPending}>
              <Star className="size-3.5 text-accent-gold" /> Set as primary
            </DropdownMenuItem>
          )}
          {photo.moderationStatus !== 'approved' && (
            <DropdownMenuItem onSelect={onApprove} disabled={isPending}>
              <Check className="size-3.5 text-success" /> Approve
            </DropdownMenuItem>
          )}
          {photo.moderationStatus !== 'rejected' && (
            <DropdownMenuItem onSelect={onReject} disabled={isPending}>
              <X className="size-3.5" /> Reject
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={onDelete} disabled={isPending}>
            <Trash2 className="size-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function formatMethod(value: string | null): string {
  if (!value) return 'Not captured';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// next/image is unused in this client component (we use <img> for presigned URLs without
// configuring remote loaders); silence the unused import for tooling.
void Image;
