import Link from 'next/link';
import { ArrowLeft, FileText, CreditCard } from 'lucide-react';
import {
  StatusBadge,
  type StatusBadgeVariant,
} from '../../../../components/ui/StatusBadge';
import type { SubscriptionStatus } from '@heartlink/api-contract';
import { serverApi } from '../../../../lib/api';
import { ProfileInfoForm } from '../../../../components/profiles/ProfileInfoForm';
import { PhotosCard } from '../../../../components/profiles/PhotosCard';
import { ActivationChecklist } from '../../../../components/profiles/ActivationChecklist';
import { ProfileDocumentsCard } from '../../../../components/profiles/ProfileDocumentsCard';
import { ProfileActions } from '../../../../components/profiles/ProfileActions';
import { ProfileActivityTimeline } from '../../../../components/profiles/ProfileActivityTimeline';

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_STATUS_VARIANT: Record<SubscriptionStatus, StatusBadgeVariant> = {
  not_started: 'neutral',
  payment_pending: 'warning',
  active: 'success',
  renewal_due: 'warning',
  grace_period: 'warning',
  expired: 'danger',
  suspended: 'danger',
};

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();
  const [detail, photos, activation, history] = await Promise.all([
    api.getProfile(id),
    api.listProfilePhotos(id),
    api.checkProfileActivation(id),
    api.getProfileHistory(id),
  ]);

  // Scans hang off the application, not the profile. Fetched separately and
  // tolerantly: a profile with no readable scan is exactly the case this card
  // exists to fix, so a failure here must not take the whole page down with it.
  const documents = await api
    .listApplicationDocuments(detail.applicationId)
    .catch(() => [] as Awaited<ReturnType<typeof api.listApplicationDocuments>>);

  // Inmate ID lives in the application's OCR fields when present. We don't
  // re-pull the application document here; show the linked application id
  // instead. Future: surface inmate_id from the latest scanned doc.
  const inmateId: string | null = null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href="/profiles"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to Profiles
        </Link>
        <span className="text-text-muted">|</span>
        <h1 className="min-w-0 truncate font-serif text-2xl leading-[34px] text-text">
          {detail.displayName ?? 'Untitled profile'} - Profile Detail
        </h1>
        <div className="flex-1" />
        <ProfileActions profile={detail} activation={activation} />
      </header>

      {/* Stacks below xl. It was a fixed two-column grid at every width, so on
          anything narrower than about 1400px the 360px side column pushed the
          page wider than the window — which is why the checklist text ran off
          the right edge instead of wrapping.

          `minmax(0, 1fr)` rather than `1fr`: a grid column defaults to
          `min-width: auto`, so a wide child stretches the column instead of
          being made to fit, and the whole page scrolls sideways. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-lg border border-border bg-background p-6">
            <ProfileInfoForm profile={detail} inmateId={inmateId} />
          </section>

          <section className="rounded-lg border border-border bg-background p-6">
            <h3 className="mb-3 font-serif text-base leading-6 text-text">
              Linked Records
            </h3>
            <div className="flex flex-wrap gap-2">
              {detail.application && (
                <Link
                  href={`/intake/${detail.application.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-info-tint px-3 py-1.5 text-[13px] font-medium text-info transition-all active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <FileText className="size-3.5" /> Application - {detail.application.id.slice(0, 8)}…
                </Link>
              )}
              {detail.subscription && (
                <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-text">
                  <CreditCard className="size-3.5" /> Subscription -{' '}
                  <StatusBadge
                    status={detail.subscription.status}
                    variantMap={SUBSCRIPTION_STATUS_VARIANT}
                  />
                </span>
              )}
            </div>
          </section>

          {/* History sits in the main column, under the records it describes.
              In the 360px side column its timestamps and descriptions had
              nowhere to go and wrapped onto three lines each. */}
          <ProfileActivityTimeline entries={history} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <PhotosCard
            detail={detail}
            photos={photos}
            requiredCount={activation.details.requiredPhotoCount}
          />
          <ActivationChecklist profileId={id} result={activation} />
          <ProfileDocumentsCard applicationId={detail.applicationId} documents={documents} />
        </div>
      </div>
    </div>
  );
}
