import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { serverApi } from '../../../../lib/api';
import { PhotoReviewGrid } from '../../../../components/profiles/PhotoReviewGrid';
import type { Facility, ListPendingPhotosQuery } from '@heartlink/api-contract';
import { Button } from '../../../../components/ui/button';
import { Select } from '../../../../components/ui/select';

export const dynamic = 'force-dynamic';

export default async function PhotoReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query: ListPendingPhotosQuery = {
    facilityId: (sp.facilityId as string | undefined) || undefined,
    sort: ((sp.sort as string | undefined) === 'oldest' ? 'oldest' : 'newest'),
    limit: parseIntOr(sp.limit, 60),
    offset: parseIntOr(sp.offset, 0),
  };

  const api = await serverApi();
  const [pending, facilities] = await Promise.all([
    api.listPendingPhotos(query),
    api.listFacilities(),
  ]);

  return (
    <div className="flex w-full flex-col gap-5 p-8">
      <header className="flex items-center gap-3">
        <Link
          href="/profiles"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to Profiles
        </Link>
        <span className="text-text-muted">|</span>
        <h1 className="font-serif text-2xl leading-[34px] text-text">Photo Review</h1>
        <span className="ml-2 inline-flex items-center rounded-full bg-warning-tint px-2.5 py-1 text-xs font-medium text-warning">
          {pending.total} {pending.total === 1 ? 'photo' : 'photos'} pending
        </span>
      </header>

      <PhotoReviewFilters facilities={facilities} query={query} />

      <PhotoReviewGrid items={pending.items} />
    </div>
  );
}

function PhotoReviewFilters({
  facilities,
  query,
}: {
  facilities: Facility[];
  query: ListPendingPhotosQuery;
}) {
  // Server-rendered <Select> wrappers; submitting either re-runs the page via
  // GET. Parameterizing with a tiny client form was overkill for v1.
  //
  // Defaults come from the query rather than being hardcoded: they were fixed
  // at "All Facilities" / "Newest", so after applying a filter the controls
  // snapped back and no longer described the list underneath them.
  return (
    <form className="flex flex-wrap items-center gap-3" action="" method="get">
      <Select
        size="sm"
        name="facilityId"
        aria-label="Facility"
        defaultValue={query.facilityId ?? ''}
        className="w-[200px]"
        options={[
          { value: '', label: 'Facility: All Facilities' },
          ...facilities.map((f) => ({ value: f.id, label: f.name })),
        ]}
      />
      <Select
        size="sm"
        name="sort"
        aria-label="Sort order"
        defaultValue={query.sort ?? 'newest'}
        className="w-[190px]"
        options={[
          { value: 'newest', label: 'Sort: Newest First' },
          { value: 'oldest', label: 'Sort: Oldest First' },
        ]}
      />
      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>
    </form>
  );
}

function parseIntOr(value: string | string[] | undefined, fallback: number): number {
  if (Array.isArray(value)) value = value[0];
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
