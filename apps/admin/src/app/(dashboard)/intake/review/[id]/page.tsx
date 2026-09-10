import { notFound } from 'next/navigation';
import { serverApi } from '../../../../../lib/api';
import { ReviewWorkspace } from '../../../../../components/intake/ReviewWorkspace';
import type { ApplicationStatus } from '@heartlink/api-contract';

export const dynamic = 'force-dynamic';

const REVIEW_STATUSES: ApplicationStatus[] = ['needs_review', 'incomplete'];

export default async function ReviewWorkspacePage({
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

  const documents = await api.listApplicationDocuments(id);

  /**
   * The document to review, in order of how likely it is to be the one.
   *
   * The last two steps are the point: this used to stop at
   * `type === 'scanned_application'` and hand the viewer `null` for anything
   * else, so an application whose PDF came in as a packet - or under any other
   * type - showed an empty pane with the file sitting in S3 the whole time.
   * A reviewer looking at a blank panel has no way to tell that from "no
   * document was ever uploaded".
   */
  const viewable = documents.filter(
    (d) => d.mimeType === 'application/pdf' || d.mimeType.startsWith('image/'),
  );
  const primaryDoc =
    viewable.find((d) => d.type === 'scanned_application' && d.ocrStatus === 'completed') ??
    viewable.find((d) => d.type === 'scanned_application') ??
    viewable.find((d) => d.type === 'packet_pdf') ??
    viewable[0] ??
    documents[0] ??
    null;

  // Build the filtered list for prev/next navigation. Fetch both needs_review
  // and incomplete separately then combine (backend doesn't yet support OR
  // filters on status).
  const [needs, incomplete] = await Promise.all([
    api.listApplications({ status: 'needs_review', limit: 200 }),
    api.listApplications({ status: 'incomplete', limit: 200 }),
  ]);
  const reviewable = [...needs.items, ...incomplete.items];
  const idx = reviewable.findIndex((a) => a.id === id);
  const prevId = idx > 0 ? reviewable[idx - 1]!.id : null;
  const nextId =
    idx >= 0 && idx < reviewable.length - 1 ? reviewable[idx + 1]!.id : null;

  // If app isn't in the reviewable list, still show it - it might have just
  // transitioned. Show position 1 of 1 in that case.
  const position =
    idx >= 0
      ? { current: idx + 1, total: reviewable.length }
      : { current: 1, total: Math.max(1, reviewable.length) };

  // Guard: if somehow a non-reviewable status lands here, still render for
  // transparency but the action buttons will be disabled by state-machine
  // validation server-side.
  void REVIEW_STATUSES;

  return (
    <ReviewWorkspace
      application={application}
      document={primaryDoc}
      prevId={prevId}
      nextId={nextId}
      position={position}
    />
  );
}
