import { PageHero } from '../../../../components/layout/PageHero';
import { redirect } from 'next/navigation';
import { serverApi } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function ReviewLandingPage() {
  const api = await serverApi();
  // Try needs_review first, then incomplete. Small limit - we only need the first.
  const needs = await api.listApplications({
    status: 'needs_review',
    limit: 1,
  });
  if (needs.items.length > 0) redirect(`/intake/review/${needs.items[0].id}`);

  const incomplete = await api.listApplications({
    status: 'incomplete',
    limit: 1,
  });
  if (incomplete.items.length > 0)
    redirect(`/intake/review/${incomplete.items[0].id}`);

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      <PageHero
        eyebrow="Intake"
        title="Review Queue"
        description="Scans waiting to be checked against the application they came from."
      />
      <div className="flex w-full items-center justify-center rounded-lg border border-border bg-background px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-serif text-lg text-text">
            Nothing to review
          </h2>
          <p className="text-sm text-text-muted">
            All applications are up to date. Check back when new scans arrive.
          </p>
        </div>
      </div>
    </div>
  );
}
