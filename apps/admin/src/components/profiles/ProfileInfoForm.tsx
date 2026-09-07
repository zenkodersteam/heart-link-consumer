'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Profile } from '@heartlink/api-contract';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { updateProfile } from '../../lib/actions';

export function ProfileInfoForm({
  profile,
  inmateId,
}: {
  profile: Profile;
  inmateId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [location, setLocation] = useState(profile.locationDescription ?? '');
  const [releaseDate, setReleaseDate] = useState(profile.releaseDate ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateProfile({
          id: profile.id,
          displayName: displayName || null,
          bio: bio || null,
          locationDescription: location || null,
          releaseDate: releaseDate || null,
          dateOfBirth: dateOfBirth || null,
        });
        toast.success('Profile updated');
      } catch (err) {
        toast.error(
          `Failed to update: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h2 className="font-serif text-base leading-6 text-text">
        Profile Information
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={isPending}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Inmate ID (read-only)</Label>
          <Input value={inmateId ?? '-'} disabled readOnly />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="releaseDate">Expected Release</Label>
          <Input
            id="releaseDate"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="location">Location Description</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isPending}
            placeholder="e.g. Cedar Ridge Correctional, Oregon"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={isPending}
          placeholder="Looking for genuine connection…"
        />
      </div>
      <div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
