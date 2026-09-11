'use client';

import { useState } from 'react';
import { ChevronDown, ScanLine } from 'lucide-react';
import { ACTIVE_FORM_SCHEMA } from '@heartlink/domain';
import type { IntakeDocument } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';

/**
 * What the scan actually came back with, when the form is empty.
 *
 * A read can finish, find plenty of text, and still fill in nothing here - and
 * until now the two outcomes looked identical: a page of blank inputs. They are
 * completely different problems. Nothing had read the extraction envelope the
 * contract already carries:
 *
 *   - `_schemaVersion` - which form the worker mapped against. If it is not the
 *     schema this screen renders, every value lands under a key nothing looks
 *     up and the form is blank however good the scan was.
 *   - `_reasons` - what the provider said it could not do.
 *   - `_rawUnmatched` - the text it found and could not place. This is the part
 *     worth showing: a reviewer can copy from it instead of re-keying from the
 *     PDF, and it is the evidence that the scan worked.
 *
 * Only shown when the mapped form is empty. A scan that filled the form needs
 * no explanation, and this would be noise on every other application.
 */
export function OcrDiagnosticsNotice({ document }: { document: IntakeDocument | null }) {
  const [open, setOpen] = useState(false);

  // `failed` too: the worker now marks a read that filled in nothing as failed
  // rather than "Read", and keeps the envelope — so the explanation of why is
  // exactly as useful there. A failure with no envelope (a crash, a missing
  // file) has nothing to explain and still falls through.
  if (!document || (document.ocrStatus !== 'completed' && document.ocrStatus !== 'failed')) {
    return null;
  }
  if (document.ocrStatus === 'failed' && !document.ocrExtractedFields) return null;

  const envelope = document.ocrExtractedFields;
  const mapped = envelope?.fields ?? {};
  const filled = Object.entries(mapped).filter(([, v]) =>
    Array.isArray(v) ? v.length > 0 : v != null && v !== '',
  );
  if (filled.length > 0) return null;

  const schemaVersion = envelope?._schemaVersion ?? null;
  const provider = envelope?._providerName ?? null;
  const reasons = envelope?._reasons ?? [];
  const unmatched = envelope?._rawUnmatched;
  const unmatchedText = renderUnmatched(unmatched);
  const schemaMismatch = Boolean(schemaVersion && schemaVersion !== ACTIVE_FORM_SCHEMA.version);

  return (
    <div className="border-b border-border bg-accent-gold-tint px-4 py-3">
      <div className="flex items-start gap-2.5">
        <ScanLine className="mt-0.5 size-4 shrink-0 text-accent-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-text">
            {document.ocrStatus === 'failed'
              ? 'This scan could not be read into the form'
              : 'The scan finished, but none of it matched this form'}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-text-muted">
            {schemaMismatch ? (
              <>
                It was read against <code className="font-mono">{schemaVersion}</code>, and this
                screen shows <code className="font-mono">{ACTIVE_FORM_SCHEMA.version}</code>. Values
                are stored under the older form&apos;s field names, so nothing lines up here.
              </>
            ) : unmatchedText ? (
              <>
                Text came back, but none of it landed in a field this form knows. That usually means
                the document is not the intake form - a different form, or a scan of something else.
              </>
            ) : (
              <>
                The reader returned no text at all. A blank page, a photograph of a screen, or a
                scan too low-contrast to read will all do this.
              </>
            )}
          </p>

          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-text-muted">
            {provider ? (
              <div className="flex gap-1.5">
                <dt className="font-semibold uppercase tracking-wide">Reader</dt>
                <dd className="font-mono">{provider}</dd>
              </div>
            ) : null}
            {schemaVersion ? (
              <div className="flex gap-1.5">
                <dt className="font-semibold uppercase tracking-wide">Read as</dt>
                <dd className={cn('font-mono', schemaMismatch && 'text-danger')}>{schemaVersion}</dd>
              </div>
            ) : null}
          </dl>

          {reasons.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-xs leading-5 text-text-muted">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}

          {unmatchedText ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-expanded={open}
              >
                <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
                {open ? 'Hide what it read' : 'Show what it read'}
              </button>
              {open ? (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-5 text-text">
                  {unmatchedText}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The unmatched blob is provider-shaped; render whatever it turns out to be. */
function renderUnmatched(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  try {
    const text = JSON.stringify(value, null, 2);
    return text === '{}' || text === '[]' ? null : text;
  } catch {
    return null;
  }
}
