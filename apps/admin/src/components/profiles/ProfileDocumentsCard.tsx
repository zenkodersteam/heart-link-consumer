'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FileText, UploadCloud } from 'lucide-react';
import type { IntakeDocument } from '@heartlink/api-contract';

import { Card, CardBody, CardHeader, CardTitle } from '../ui/card';
import { isOcrRunning } from '../../lib/ocr';
import { OcrProgress } from '../intake/OcrProgress';
import { RetryOcrButton } from '../intake/RetryOcrButton';
import { LocalTime } from '@/components/ui/LocalTime';

/**
 * The scanned applications behind a profile, and a way to replace them.
 *
 * Until now a scan could only be uploaded from the intake screen, and only
 * while the application sat at `returned` - `canUploadReturnedScan` allows that
 * one status. An application has to move past it to become a profile, so the
 * upload control disappeared for good the moment the profile existed. A scan
 * that was crooked, unreadable, or simply never taken could not be corrected
 * afterwards from anywhere.
 *
 * That is not cosmetic. The name a letter is addressed to comes from OCR on the
 * latest scanned application, never from the profile's display name, because
 * correctional mail has to carry the inmate's legal name. A profile with no
 * readable scan cannot be written to at all: dispatch fails with
 * "missing/blank: fullName" and the letters sit queued.
 *
 * Uploading here adds a new document rather than replacing the old one. The
 * addressing code takes the newest, so a fresh scan wins immediately, and the
 * previous ones stay as the record of what was actually received.
 */
export function ProfileDocumentsCard({
  applicationId,
  documents,
}: {
  applicationId: string | null;
  documents: IntakeDocument[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  // Newest first: that is the one addressing will use, so it belongs at the top.
  const ordered = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Only the newest scan is consulted, so this is the name a letter would carry.
  const addressedTo = ordered.length > 0 ? readName(ordered[0]) : null;

  async function onFile(file: File) {
    if (!applicationId) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/intake/${applicationId}/documents`, {
        method: 'POST',
        body,
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      toast.success('Scan uploaded', {
        description: 'It is being read now — the progress is on the scan below.',
      });
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the scan');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Card>
      {/* Stacked, not side by side. This card lives in a 360px column, where a
          title, a sentence of explanation and a button on one row leaves the
          heading wrapping mid-word and the text in a three-word ribbon. */}
      <CardHeader className="flex flex-col gap-3">
        <div className="min-w-0">
          <CardTitle>Scanned application</CardTitle>
          {/* The state that matters, said once at the top rather than repeated
              in red on every row: only the newest scan addresses a letter. */}
          {addressedTo ? (
            <p className="mt-1 text-sm text-text-muted">
              Letters are addressed to <span className="font-medium text-text">{addressedTo}</span>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-danger">
              No name has been read from a scan, so letters to this profile cannot be addressed.
            </p>
          )}
        </div>
        {applicationId ? (
          <>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-border bg-background px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface disabled:opacity-60"
            >
              <UploadCloud aria-hidden className="size-4" />
              {uploading ? 'Uploading…' : documents.length ? 'Upload a new scan' : 'Upload a scan'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </>
        ) : null}
      </CardHeader>

      <CardBody>
        {!applicationId ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            This profile has no linked application, so there is nowhere to attach a scan.
          </p>
        ) : ordered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            No scan on file. Letters to this profile cannot be addressed until one is uploaded and
            read.
          </p>
        ) : (
          ordered.map((doc, i) => {
            const name = readName(doc);
            const current = i === 0;
            return (
              <div
                key={doc.id}
                className={`flex items-start gap-2.5 px-5 py-3 ${
                  i !== ordered.length - 1 ? 'border-b border-border' : ''
                } ${current ? '' : 'opacity-70'}`}
              >
                <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-text-muted" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* Several scans are often uploaded the same day, so the time
                      is what actually tells them apart. */}
                  <span className="text-[13px] font-medium text-text">
                    <LocalTime value={doc.createdAt} />
                  </span>
                  {/* While a read is running the bar says so and watches for
                      the result; once it has settled, the name (or why there
                      is none) is the useful thing to show. */}
                  {isOcrRunning(doc.ocrStatus) ? (
                    <OcrProgress status={doc.ocrStatus} className="mt-0.5" />
                  ) : (
                    <span className="text-[12px] text-text-muted">
                      {name ? <span className="text-text">{name}</span> : humanizeOcrStatus(doc.ocrStatus)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {current ? (
                    <span className="rounded-sm bg-primary-tint px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      In use
                    </span>
                  ) : null}
                  {/* Nothing to retry while it is already being read — the API
                      refuses it, and two workers on one document is the reason
                      why. */}
                  {isOcrRunning(doc.ocrStatus) ? null : <RetryOcrButton documentId={doc.id} />}
                </div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

/** The name addressing actually uses, in the order the API looks for it. */
function readName(doc: IntakeDocument): string | null {
  // The worker stores values under `.fields` inside an envelope, beside its
  // own `_reasons` and `_schemaVersion`. Reading the envelope's top level found
  // nothing, so every profile said no name had been read — however good the
  // scan. The top level is kept as a fallback for any document stored flat.
  const envelope = (doc.ocrExtractedFields ?? {}) as Record<string, unknown>;
  const fields = ((envelope.fields as Record<string, unknown> | undefined) ?? envelope);
  const pick = (key: string): string | null => {
    const raw = fields[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    // Some OCR fields arrive as { value, confidence } rather than a bare string.
    if (raw && typeof raw === 'object' && 'value' in raw) {
      const v = (raw as { value?: unknown }).value;
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };
  return pick('full_name') ?? pick('printed_name');
}

/** Raw enum values like `not_applicable` are not for reading. */
function humanizeOcrStatus(status: IntakeDocument['ocrStatus']): string {
  switch (status) {
    case 'pending':
      return 'Waiting to be read';
    case 'processing':
      return 'Being read';
    case 'completed':
      return 'Read, but no name found';
    case 'failed':
      return 'Could not be read';
    case 'not_applicable':
      return 'Not a scanned application';
    default:
      return status;
  }
}
