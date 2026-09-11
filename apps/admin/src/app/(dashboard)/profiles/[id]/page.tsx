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

/**
 * The inmate ID the newest scan carried, if any.
 *
 * Same shape rules as the addressed name: OCR writes some fields as bare
 * strings and others as `{ value, confidence }`, and the key it uses has
 * changed once already, so both spellings are looked for.
 */
function readInmateId(
  documents: Array<{ createdAt: string; ocrExtractedFields?: unknown }>,
): string | null {
  const newest = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!newest) return null;
  // Values live under `.fields` in the worker's envelope; see readName in
  // ProfileDocumentsCard for why the top level is only a fallback.
  const envelope = (newest.ocrExtractedFields ?? {}) as Record<string, unknown>;
  const fields = (envelope.fields as Record<string, unknown> | undefined) ?? envelope;
  for (const key of ['inmate_id', 'inmate_number', 'id_number']) {
    const raw = fields[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (raw && typeof raw === 'object' && 'value' in raw) {
      const value = (raw as { value?: unknown }).value;
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

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

  // Inmate ID comes off the scan, like the addressed name does. It was left as
  // a hard-coded null with a note to do this later, so the field rendered an
  // em dash on every profile in the console and read as "we hold no ID for
  // this person" even where the scan plainly carried one.
  const inmateId = readInmateId(documents);

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
          {/* The checklist links here. `scroll-mt` clears the sticky header,
              which the browser does not know about and would otherwise scroll
              the card straight underneath. */}
          <div id="photos" className="scroll-mt-24">
            <PhotosCard
              detail={detail}
              photos={photos}
              requiredCount={activation.details.requiredPhotoCount}
            />
          </div>
          <ActivationChecklist result={activation} />
          <ProfileDocumentsCard applicationId={detail.applicationId} documents={documents} />
        </div>
      </div>
    </div>
  );
}
