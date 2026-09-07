import { serverApi } from '../../../lib/api';
import { ProfilesFilters } from '../../../components/profiles/ProfilesFilters';
import {
  ProfilesTable,
  type ProfileRowExtras,
} from '../../../components/profiles/ProfilesTable';
import { Pagination } from '../../../components/intake/Pagination';
import type {
  Facility,
  ListProfilesQuery,
  ProfileStatus,
} from '@heartlink/api-contract';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { PageHero } from '../../../components/layout/PageHero';
import { MarkSectionSeen } from '../../../components/shell/MarkSectionSeen';

export const dynamic = 'force-dynamic';

export default async function ProfilesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query: ListProfilesQuery = {
    status: (sp.status as ProfileStatus | undefined) || undefined,
    facilityId: (sp.facilityId as string | undefined) || undefined,
    q: (sp.q as string | undefined) || undefined,
    // These two were set by the filter bar and never read here, so choosing one
    // did nothing at all.
    hasPhotos: (sp.hasPhotos as 'yes' | 'no' | undefined) || undefined,
    payment: (sp.payment as 'confirmed' | 'unconfirmed' | undefined) || undefined,
    limit: parseIntOr(sp.limit, 25),
    offset: parseIntOr(sp.offset, 0),
  };

  const api = await serverApi();
  const [profilesResponse, facilities] = await Promise.all([
    api.listProfiles(query),
    api.listFacilities(),
  ]);

  const facilitiesById = Object.fromEntries(
    facilities.map((f: Facility) => [f.id, f]),
  ) as Record<string, Facility>;

  // Pull each profile's photos + activation status in parallel for the row
  // extras (Photos count, Primary, Payment label). N small calls, fine for the
  // first page; if perf bites later, push these into a single backend join.
  const extrasEntries = await Promise.all(
    profilesResponse.items.map(async (profile) => {
      try {
        const [photos, activation] = await Promise.all([
          api.listProfilePhotos(profile.id),
          api.checkProfileActivation(profile.id),
        ]);
        const approvedPhotoCount = photos.filter(
          (p) => p.moderationStatus === 'approved',
        ).length;
        const hasPrimary = !!profile.primaryPhotoId;
        const blockerCodes = new Set((activation.blockers ?? []).map((b) => b.code));
        const paymentLabel = activation.details.subscriptionActive
          ? 'Confirmed'
          : blockerCodes.has('listing_payment_unconfirmed')
            ? 'Needs confirm'
            : 'Pending';
        const blockerSummary = activation.ok
          ? 'Ready'
          : (activation.blockers ?? []).map((b) => formatBlocker(b.code)).join(', ');
        const ex: ProfileRowExtras = {
          approvedPhotoCount,
          hasPrimary,
          paymentLabel,
          blockerSummary,
        };
        return [profile.id, ex] as const;
      } catch {
        return [
          profile.id,
          {
            approvedPhotoCount: 0,
            hasPrimary: false,
            paymentLabel: '-',
            blockerSummary: '-',
          },
        ] as const;
      }
    }),
  );
  const extras = Object.fromEntries(extrasEntries) as Record<string, ProfileRowExtras>;

  return (
    <div className="flex w-full flex-col gap-5 p-8">
      <MarkSectionSeen section="profiles" />
      <PageHero
        eyebrow="Profiles"
        title="Profiles"
        description="Manage listings with warmer, more premium framing while keeping payment, moderation, and activation blockers obvious for staff."
        actions={
          <Link href="/profiles/photo-review">
            <Button variant="outline" size="md">
              Photo Review
            </Button>
          </Link>
        }
      />

      <ProfilesFilters facilities={facilities} />

      <ProfilesTable
        items={profilesResponse.items}
        extras={extras}
        facilitiesById={facilitiesById}
      />

      <Pagination
        total={profilesResponse.total}
        limit={profilesResponse.limit}
        offset={profilesResponse.offset}
      />
    </div>
  );
}

function parseIntOr(value: string | string[] | undefined, fallback: number): number {
  if (Array.isArray(value)) value = value[0];
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function formatBlocker(code: string): string {
  switch (code) {
    case 'application_not_verified':
      return 'Verify application';
    case 'photos_insufficient':
      return 'Photos incomplete';
    case 'listing_payment_unconfirmed':
      return 'Confirm payment';
    case 'moderation_blocked':
      return 'Moderation blocked';
    default:
      return code;
  }
}
