import { serverApi } from '../../../lib/api';
import { IntakeFilters } from '../../../components/intake/IntakeFilters';
import { IntakeStatusTabs } from '../../../components/intake/IntakeStatusTabs';
import { IntakeTable } from '../../../components/intake/IntakeTable';
import { IntakeCreateDialog } from '../../../components/intake/IntakeCreateDialog';
import { Pagination } from '../../../components/intake/Pagination';
import type {
  ApplicationStatus,
  Facility,
  ListApplicationsQuery,
} from '@heartlink/api-contract';
import { Button } from '../../../components/ui/button';
import { PageHero } from '../../../components/layout/PageHero';
import { MarkSectionSeen } from '../../../components/shell/MarkSectionSeen';

export const dynamic = 'force-dynamic';

export default async function IntakeQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query: ListApplicationsQuery = {
    status: (sp.status as ApplicationStatus | undefined) || undefined,
    facilityId: (sp.facilityId as string | undefined) || undefined,
    dateFrom: (sp.dateFrom as string | undefined) || undefined,
    dateTo: (sp.dateTo as string | undefined) || undefined,
    q: (sp.search as string | undefined) || undefined,
    limit: parseIntOr(sp.limit, 25),
    offset: parseIntOr(sp.offset, 0),
  };

  const api = await serverApi();
  const [applications, facilities] = await Promise.all([
    api.listApplications(query),
    api.listFacilities(),
  ]);

  const facilitiesById = Object.fromEntries(
    facilities.map((f: Facility) => [f.id, f]),
  ) as Record<string, Facility>;

  return (
    <div className="flex w-full flex-col gap-5 p-8">
      <MarkSectionSeen section="intake" />
      <PageHero
        eyebrow="Intake"
        title="Intake Queue"
        description="Review new submissions with a calmer, higher-trust presentation that keeps document handling and verification work readable at a glance."
        actions={
          <IntakeCreateDialog
            facilities={facilities}
            trigger={
              <Button size="md" variant="primary">
                + Create Intake Application
              </Button>
            }
          />
        }
      />

      <IntakeStatusTabs
        statusCounts={applications.statusCounts}
        total={applications.total}
      />

      <IntakeFilters facilities={facilities} />

      <IntakeTable
        items={applications.items}
        facilitiesById={facilitiesById}
      />

      <Pagination
        total={applications.total}
        limit={applications.limit}
        offset={applications.offset}
      />
    </div>
  );
}

function parseIntOr(value: string | string[] | undefined, fallback: number): number {
  if (Array.isArray(value)) value = value[0];
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
