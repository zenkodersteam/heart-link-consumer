'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react';
import type { AdminUserLookupItem, Profile } from '@heartlink/api-contract';
import { recordInboundScan, searchProfilesForLookup } from '../../lib/actions';
import { filterInboundProfiles, filterInboundUsers } from '../../lib/inboundMailLookup';
import { Button } from '../ui/button';
import { Combobox } from '../ui/combobox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function InboundMailForm({
  profiles,
  users,
}: {
  profiles: Profile[];
  users: AdminUserLookupItem[];
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [profileQuery, setProfileQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  // The combobox shows the chosen row when closed, so the selection has to live
  // here rather than being read off an uncontrolled <select> at submit time.
  const [profileId, setProfileId] = useState('');
  const [userId, setUserId] = useState('');

  /**
   * Listings matching what has been typed.
   *
   * Asked of the server rather than filtered in the browser: the form is handed
   * only the first page of profiles, so a local filter could never find anyone
   * outside it — and looking up the listing a letter belongs to is exactly when
   * the list is longer than one page.
   *
   * Seeded with the page's own profiles so the field is useful before a single
   * key is pressed, and debounced so typing does not fire a request per letter.
   */
  /**
   * The last lookup that came back, tagged with the query it answered.
   *
   * Storing the query alongside the rows is what lets "still searching" and
   * "nothing typed" be derived rather than tracked in their own state. Setting
   * those synchronously inside the effect made React re-render twice for every
   * keystroke — once for the flag, once for the rows.
   */
  const [lookup, setLookup] = useState<{
    query: string;
    rows: Array<Pick<Profile, 'id' | 'displayName'>>;
  } | null>(null);

  const trimmedQuery = profileQuery.trim();
  // Results only count when they answer the query on screen now; anything else
  // belongs to a keystroke that has already been superseded.
  const remoteProfiles = lookup && lookup.query === trimmedQuery ? lookup.rows : null;
  const lookupPending = trimmedQuery.length > 0 && remoteProfiles === null;

  useEffect(() => {
    const q = profileQuery.trim();
    if (!q) return;

    let cancelled = false;
    const id = setTimeout(() => {
      void searchProfilesForLookup(q).then((rows) => {
        if (!cancelled) setLookup({ query: q, rows });
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [profileQuery]);

  const filteredProfiles = useMemo(
    () => remoteProfiles ?? filterInboundProfiles(profiles, profileQuery),
    [remoteProfiles, profileQuery, profiles],
  );

  const filteredUsers = useMemo(
    () => filterInboundUsers(users, userQuery),
    [userQuery, users],
  );

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await recordInboundScan(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      // Recording a scan redirects and clears the form, which on its own looks
      // like the page simply reset — say that the letter actually landed.
      toast.success('Inbound letter recorded', {
        description: 'It is now on the member’s thread.',
      });
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profileId">Inmate profile</Label>
          <Combobox
            id="profileId"
            name="profileId"
            required
            disabled={isPending}
            value={profileId}
            onValueChange={setProfileId}
            placeholder="Select inmate profile"
            searchPlaceholder="Search by name or profile ID"
            emptyMessage={
              profileQuery.trim() ? `No listing matches “${profileQuery.trim()}”.` : 'No listings yet.'
            }
            onSearchChange={setProfileQuery}
            loading={lookupPending}
            // A short reference rather than the whole UUID. The full id was
            // untidy, but dropping it outright would leave two listings both
            // called "Facility Name" impossible to tell apart — and attaching
            // someone's letter to the wrong person is not a harmless mistake.
            // Searching still matches the full id even though it is not shown.
            options={filteredProfiles.map((p) => ({
              value: p.id,
              label: p.displayName ?? 'Unnamed profile',
              hint: shortRef(p.id),
            }))}
          />
          <p className="text-[12px] text-text-muted">
            Searches every listing, not just the ones on this page.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="userId">Outside user</Label>
          <Combobox
            id="userId"
            name="userId"
            required
            disabled={isPending}
            value={userId}
            onValueChange={setUserId}
            placeholder="Select outside user"
            searchPlaceholder="Search by name, email, or user ID"
            emptyMessage={userQuery.trim() ? 'No user matches that search.' : 'No users yet.'}
            onSearchChange={setUserQuery}
            options={filteredUsers.map((u) => ({
              value: u.id,
              label: u.displayName ?? u.email,
              hint: u.email,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject (optional)</Label>
        <Input
          id="subject"
          name="subject"
          placeholder="Short label for the thread"
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">Scanned reply</Label>
        <label
          htmlFor="file"
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-surface/40 px-4 py-4 text-sm text-text-muted transition-colors hover:border-border-strong hover:bg-surface"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-accent-gold-tint text-accent-gold">
            <UploadCloud aria-hidden className="size-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium text-text">
              {fileName ?? 'Choose a scan to upload'}
            </span>
            <span className="block text-xs text-text-muted">PDF, JPEG, or PNG, up to 10 MB</span>
          </span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          disabled={isPending}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="sr-only"
        />
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" variant="primary" size="md" disabled={isPending}>
          {isPending ? 'Recording…' : 'Record inbound scan'}
        </Button>
      </div>
    </form>
  );
}

/**
 * The last six characters of an id, as a reference someone can read aloud.
 *
 * Enough to separate two listings with the same display name, without putting
 * a thirty-six character UUID under every row.
 */
function shortRef(id: string): string {
  return `#${id.replace(/-/g, '').slice(-6)}`;
}
