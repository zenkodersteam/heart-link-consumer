import type { IntakeDocument, ExtractedFieldValue } from '@heartlink/api-contract';
import { ACTIVE_FORM_SCHEMA, type FieldSpec } from '@heartlink/domain';
import { Card, CardHeader, CardTitle } from '../ui/card';
import {
  bucketConfidence,
  confidenceDotClass,
} from '../../lib/confidence';
import { cn } from '../../lib/utils';

/**
 * Read-only presentation of a document's OCR extracted fields, laid out per
 * Figma `13:142`. Each row has a confidence-colored dot + fixed-width label +
 * value text, with type-aware formatting (arrays → pills, booleans →
 * Yes/No, dates → locale, enums → humanized).
 *
 * Sensitive fields (e.g. crime_incarcerated_for, on_death_row) are gated by
 * the `showSensitive` prop. Default is `true` to preserve existing admin
 * behavior; consumer-facing callers must pass `false`. See ADR-013 point 7.
 *
 * Layer is fully schema-driven: iterates `ACTIVE_FORM_SCHEMA.fields` without
 * hardcoding any field key. Hot-swap contract preserved.
 */
export function ApplicantInfoCard({
  document,
  showSensitive = true,
}: {
  document: IntakeDocument | null;
  showSensitive?: boolean;
}) {
  const fields = ACTIVE_FORM_SCHEMA.fields.filter(
    (f) => showSensitive || !f.sensitive,
  );
  const values = (document?.ocrExtractedFields?.fields ?? {}) as Record<
    string,
    ExtractedFieldValue
  >;
  const scores = (document?.ocrConfidenceScores ?? {}) as Record<
    string,
    number | null
  >;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applicant Information</CardTitle>
      </CardHeader>
      <div className="flex flex-col">
        {fields.map((f, idx) => (
          <FieldRow
            key={f.key}
            field={f}
            value={values[f.key] ?? null}
            confidence={scores[f.key] ?? null}
            isLast={idx === fields.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

function FieldRow({
  field,
  value,
  confidence,
  isLast,
}: {
  field: FieldSpec;
  value: ExtractedFieldValue;
  confidence: number | null;
  isLast: boolean;
}) {
  const bucket = bucketConfidence(confidence);
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-5 py-3',
        !isLast && 'border-b border-border',
      )}
    >
      <span
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', confidenceDotClass(bucket))}
        aria-hidden
      />
      <div className="flex w-[160px] shrink-0 items-center gap-1.5 pt-0.5">
        <span className="text-[13px] font-medium leading-[18px] text-text-muted">
          {field.label}
        </span>
      </div>
      <div className="flex-1 min-w-0 text-sm leading-5 text-text">
        {formatExtracted(field, value)}
      </div>
    </div>
  );
}

/**
 * Render a value according to its FieldSpec. Branches cover every FieldType
 * plus multi-select arrays. null / empty returns em-dash.
 */
function formatExtracted(field: FieldSpec, value: ExtractedFieldValue): React.ReactNode {
  if (value === null || value === undefined) return <Placeholder />;
  if (Array.isArray(value)) {
    if (value.length === 0) return <Placeholder />;
    const shown = value.slice(0, 6);
    const extra = value.length - shown.length;
    return (
      <div className="flex flex-wrap gap-1">
        {shown.map((v) => (
          <span
            key={v}
            className="rounded-sm bg-surface px-1.5 py-0.5 text-[12px] leading-4 text-text"
          >
            {humanize(v)}
          </span>
        ))}
        {extra > 0 && (
          <span className="text-[12px] leading-4 text-text-muted">+{extra} more</span>
        )}
      </div>
    );
  }
  // value is string from here
  if (value === '') return <Placeholder />;
  switch (field.type) {
    case 'boolean':
      return value === 'true' ? (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>✓</span>
          <span>Yes</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-text-muted">
          <span aria-hidden>✗</span>
          <span>No</span>
        </span>
      );
    case 'date': {
      const d = new Date(value);
      if (!Number.isFinite(d.getTime())) return <span>{value}</span>;
      return <span>{d.toLocaleDateString()}</span>;
    }
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) return <span>{value}</span>;
      return <span>{new Intl.NumberFormat().format(n)}</span>;
    }
    case 'enum':
      // If the stored value didn't canonicalize against enumValues it's raw.
      // Either way, humanize() cleans snake_case values and is a no-op for
      // free-text fallbacks.
      return <span>{humanize(value)}</span>;
    case 'string':
    default:
      return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
}

function humanize(v: string): string {
  if (/^\d+$/.test(v)) return v;
  if (!/^[a-z0-9_]+$/.test(v)) return v; // leave arbitrary text alone
  return v
    .split('_')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function Placeholder() {
  return <span className="text-text-muted">-</span>;
}
