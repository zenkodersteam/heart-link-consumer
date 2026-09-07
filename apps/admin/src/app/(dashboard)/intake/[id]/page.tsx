import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { serverApi } from '../../../../lib/api';
import { ApplicantInfoCard } from '../../../../components/intake/ApplicantInfoCard';
import { DocumentsCard } from '../../../../components/intake/DocumentsCard';
import { StatusTimeline } from '../../../../components/intake/StatusTimeline';
import { LinkedProfileCard } from '../../../../components/intake/LinkedProfileCard';
import { StatusBadge } from '../../../../components/intake/StatusBadge';
import { DetailActions } from '../../../../components/intake/DetailActions';
import { Button } from '../../../../components/ui/button';
import { formatShortDate } from '../../../../lib/utils';
import type { Facility } from '@heartlink/api-contract';

export const dynamic = 'force-dynamic';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();

  let application;
  try {
    application = await api.getApplication(id);
  } catch {
    notFound();
  }

  const [documents, history, facilities] = await Promise.all([
    api.listApplicationDocuments(id),
    api.getApplicationHistory(id),
    api.listFacilities(),
  ]);

  const facilitiesById = Object.fromEntries(
    facilities.map((f: Facility) => [f.id, f]),
  ) as Record<string, Facility>;

  // Primary scanned application doc (drives applicant info panel)
  const primaryDoc =
    documents.find(
      (d) => d.type === 'scanned_application' && d.ocrStatus === 'completed',
    ) ??
    documents.find((d) => d.type === 'scanned_application') ??
    null;

  const needsReview =
    application.status === 'needs_review' ||
    application.status === 'incomplete';

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      {/* Top row */}
      <div className="flex items-center gap-4">
        <Link
          href="/intake"
          className="flex items-center gap-1.5 text-sm font-medium leading-5 text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to Queue
        </Link>
        <div className="flex-1" />
        {needsReview && (
          <Link href={`/intake/review/${id}`}>
            <Button size="sm" variant="primary">
              Review Application
            </Button>
          </Link>
        )}
        <DetailActions
          applicationId={id}
          currentStatus={application.status}
        />
      </div>

      {/* App info row */}
      <div className="flex items-center gap-4">
        <h1 className="font-serif text-2xl leading-[34px] text-text">
          {application.applicationNumber}
        </h1>
        <StatusBadge status={application.status} size="md" />
        <span className="text-sm leading-5 text-text-muted">
          {facilitiesById[application.facilityId]?.name ?? 'Unknown facility'}
        </span>
        <span className="text-sm leading-5 text-text-muted">
          Received: {formatShortDate(application.createdAt)}
        </span>
      </div>

      {/* Two-column content */}
      <div className="flex w-full gap-6">
        <div className="flex flex-1 flex-col gap-5 min-w-0">
          <ApplicantInfoCard document={primaryDoc} />
          <DocumentsCard documents={documents} />
        </div>
        <div className="flex w-[340px] shrink-0 flex-col gap-5">
          <StatusTimeline entries={history} />
          <LinkedProfileCard />
        </div>
      </div>
    </div>
  );
}
