import type { Facility } from '@heartlink/api-contract';
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { serverApi } from '../../../lib/api';
import { FacilityFormDialog } from '../../../components/facilities/FacilityFormDialog';
import { PageHero } from '../../../components/layout/PageHero';
import { FacilityImportDialog } from '../../../components/facilities/FacilityImportDialog';
import {
  formatFacilityLabel,
  formatFacilityNotes,
  isNonProductionFacilityName,
} from '../../../lib/adminDisplay';
import {
  buildFacilitiesOverview,
  formatFacilityAddress,
  formatFacilityLocation,
  getFacilityStatusLabel,
} from '../../../lib/facilitiesDisplay';
import { isRedirectError } from '@/lib/redirect-error';

export const dynamic = 'force-dynamic';

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'neutral',
} as const;

export default async function FacilitiesPage() {
  let facilities: Facility[] = [];
  let loadError: string | null = null;
  try {
    const api = await serverApi();
    facilities = await api.listFacilities();
  } catch (err) {
    // A missing session redirects; shown as a load error it read "NEXT_REDIRECT".
    if (isRedirectError(err)) throw err;
    loadError = err instanceof Error ? err.message : String(err);
  }

  const overview = buildFacilitiesOverview(facilities);

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      <PageHero
        eyebrow="Facilities"
        title="Facilities"
        description="Maintain the approved network of correctional facilities in the same warm, premium system used across HeartLink's admin workflows."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FacilityImportDialog />
            <FacilityFormDialog
              mode="create"
              trigger={
                <Button variant="primary" size="md">
                  + Add Facility
                </Button>
              }
            />
          </div>
        }
      />

      {!loadError && facilities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total facilities" value={String(overview.total)} />
          <MetricCard label="Active" value={String(overview.active)} />
          <MetricCard label="Inactive" value={String(overview.inactive)} />
          <MetricCard label="Internal test records" value={String(overview.internal)} />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Facility roster</CardTitle>
          <p className="mt-1 text-sm text-text-muted">
            Keep mailing addresses and activation-safe facility records clean enough for operators to trust at a glance.
          </p>
        </CardHeader>
        <CardBody>
          {loadError ? (
            <div className="px-5 py-6 text-sm text-text-muted">
              Unable to load facilities right now.
            </div>
          ) : facilities.length === 0 ? (
            <div className="px-5 py-6 text-sm text-text-muted">
              No facilities yet. Add your first one to start accepting applications.
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Scrolls on its own. A table has a natural minimum width, so on
                  a narrow screen it otherwise squashes its columns unreadably or
                  drags the whole page sideways. */}
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3 font-medium">Facility</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 font-medium">Mailing address</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f, idx) => (
                    <tr
                      key={f.id}
                      className={
                        idx % 2 === 0
                          ? 'border-b border-border'
                          : 'border-b border-border bg-surface/40'
                      }
                    >
                      <td className="px-5 py-3 text-text">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium">{formatFacilityLabel(f)}</div>
                          {isNonProductionFacilityName(f.name) ? (
                            <span className="text-xs uppercase tracking-wide text-text-muted">
                              Internal test record
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-text-muted">{formatFacilityLocation(f)}</td>
                      <td className="px-5 py-3 text-text-muted">
                        <span className="line-clamp-2 max-w-[360px]">{formatFacilityAddress(f)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={f.status}
                          variantMap={STATUS_VARIANTS}
                          label={getFacilityStatusLabel(f.status)}
                        />
                      </td>
                      <td className="px-5 py-3 text-text-muted">
                        <span className="line-clamp-1 max-w-[360px]">
                          {formatFacilityNotes(f.notes)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <FacilityFormDialog
                          mode="edit"
                          facility={f}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody className="gap-1 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
          {label}
        </div>
        <div className="font-serif text-[28px] leading-none text-text">{value}</div>
      </CardBody>
    </Card>
  );
}
