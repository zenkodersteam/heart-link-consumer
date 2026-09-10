import type {
  IntakeDocument,
  IntakeIngestionSource,
  IntakeIngestionStatus,
  OcrStatus,
} from '@heartlink/api-contract';
import { FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { cn, formatShortDate } from '../../lib/utils';
import { OcrProgress, isOcrRunning } from './OcrProgress';
import { RetryOcrButton } from './RetryOcrButton';

/** Figma `13:166`: list of documents, each with thumbnail + name + View button */
export function DocumentsCard({ documents }: { documents: IntakeDocument[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <div className="flex flex-col">
        {documents.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-text-muted">
            No documents uploaded yet.
          </div>
        ) : (
          documents.map((doc, idx) => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                idx !== documents.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <DocumentIcon mimeType={doc.mimeType} />
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium leading-5 text-text">
                    {humanizeType(doc.type)}
                  </span>
                  {doc.ingestionStatus && (
                    <span className={badgeClass(doc.ingestionStatus)}>
                      {humanizeIngestionStatus(doc.ingestionStatus)}
                    </span>
                  )}
                  {doc.ingestionSource && (
                    <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                      {humanizeIngestionSource(doc.ingestionSource)}
                    </span>
                  )}
                  {/* How the scan read. A failure used to be invisible here, so
                      an application simply sat in the queue with nothing saying
                      why it never progressed.

                      Only the settled states are a badge. A read still running
                      gets the bar below instead, which watches for the answer
                      rather than showing a word that will not change on its
                      own. */}
                  {doc.type === 'scanned_application' &&
                    doc.ocrStatus !== 'not_applicable' &&
                    !isOcrRunning(doc.ocrStatus) && (
                      <span className={ocrBadgeClass(doc.ocrStatus)}>
                        {humanizeOcrStatus(doc.ocrStatus)}
                      </span>
                    )}
                </div>
                <span className="text-xs leading-4 text-text-muted">
                  {formatShortDate(doc.createdAt)}
                  {doc.fileSizeBytes
                    ? ` · ${formatBytes(doc.fileSizeBytes)}`
                    : ''}
                </span>
                {doc.type === 'scanned_application' && isOcrRunning(doc.ocrStatus) ? (
                  <OcrProgress status={doc.ocrStatus} className="mt-1 max-w-[280px]" />
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* Only once a read has finished: re-queueing one that is still
                    running would have two workers writing the same fields. */}
                {doc.type === 'scanned_application' &&
                (doc.ocrStatus === 'failed' || doc.ocrStatus === 'completed') ? (
                  <RetryOcrButton documentId={doc.id} />
                ) : null}
                {doc.presignedUrl ? (
                  <a
                    href={doc.presignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-sm border border-border px-3 py-1.5 text-xs font-medium leading-4 text-text hover:bg-surface"
                  >
                    View
                  </a>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/**
 * What kind of file this is, at a glance.
 *
 * The row used to open with a grey rectangle - the same one on every document,
 * so a scan and a photograph looked identical until you read the label. The
 * tile is tinted by kind as well as marked, because colour is the part that
 * reads while scanning a list rather than examining one row.
 */
function DocumentIcon({ mimeType }: { mimeType: string }) {
  const kind = mimeType === 'application/pdf' ? 'pdf' : mimeType.startsWith('image/') ? 'image' : 'other';

  const { Icon, label, tile, glyph } = {
    pdf: {
      Icon: FileText,
      label: 'PDF document',
      tile: 'bg-primary-tint',
      glyph: 'text-primary',
    },
    image: {
      Icon: ImageIcon,
      label: 'Image',
      tile: 'bg-accent-gold-tint',
      glyph: 'text-accent-gold',
    },
    other: {
      Icon: Paperclip,
      label: 'File',
      tile: 'bg-surface',
      glyph: 'text-text-muted',
    },
  }[kind];

  return (
    <span
      className={cn('grid size-9 shrink-0 place-items-center rounded-lg', tile)}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon className={cn('size-4.5', glyph)} aria-hidden />
    </span>
  );
}

function humanizeType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeIngestionStatus(status: IntakeIngestionStatus): string {
  switch (status) {
    case 'ocr_pending':
      return 'OCR pending';
    case 'review_pending':
      return 'Review pending';
    case 'rejected_ingest':
      return 'Rejected ingest';
    case 'uploaded':
    default:
      return 'Uploaded';
  }
}

function humanizeIngestionSource(source: IntakeIngestionSource): string {
  switch (source) {
    case 'business_anywhere_scan':
      return 'Business Anywhere';
    case 'mailroom_scan':
      return 'Mailroom';
    case 'operator_upload':
      return 'Operator upload';
    case 'staff_upload':
    default:
      return 'Staff upload';
  }
}

function humanizeOcrStatus(status: OcrStatus): string {
  switch (status) {
    case 'pending':
      return 'Waiting to be read';
    case 'processing':
      return 'Being read';
    case 'completed':
      return 'Read';
    case 'failed':
      return 'Could not be read';
    default:
      return status;
  }
}

function ocrBadgeClass(status: OcrStatus): string {
  const base = 'rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide';
  switch (status) {
    case 'failed':
      return `${base} bg-danger/12 text-danger`;
    case 'completed':
      return `${base} bg-success/12 text-success`;
    case 'processing':
      return `${base} bg-info/12 text-info`;
    case 'pending':
    default:
      return `${base} bg-surface-muted text-text-muted`;
  }
}

function badgeClass(status: IntakeIngestionStatus): string {
  switch (status) {
    case 'review_pending':
      return 'rounded-sm bg-warning/12 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning';
    case 'rejected_ingest':
      return 'rounded-sm bg-danger/12 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-danger';
    case 'ocr_pending':
      return 'rounded-sm bg-info/12 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-info';
    case 'uploaded':
    default:
      return 'rounded-sm bg-success/12 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
