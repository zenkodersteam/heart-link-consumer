/**
 * Shape of a HeartLink intake form. Versioned + swappable — the live schema
 * is re-exported as `ACTIVE_FORM_SCHEMA` in `./index.ts`. Swapping schema
 * versions is a single-line change there. No DB migration is needed: extracted
 * fields live in a JSONB column keyed by `FieldSpec.key`.
 *
 * Hot-swap contract (transcript 2026-04-21, lines 94–100):
 *   - Adding a field = add one entry to the active schema file.
 *   - Removing a field = delete one entry.
 *   - Changing a field's type/multi/enumValues/thresholds = edit that entry.
 *   - Every consumer (mapper, editor, display card, zod validator) must
 *     introspect the schema at runtime. No layer may hardcode field keys.
 *     Only a brand-new `FieldType` variant requires code changes outside the
 *     schema file.
 */

export type FieldType = 'string' | 'date' | 'number' | 'enum' | 'boolean';

export interface FieldSpec {
  /** Canonical programmatic key (stored in the JSONB). Stable across versions. */
  key: string;
  /** Primary label as it typically appears on the form. */
  label: string;
  /** Alternate labels the provider might return for the same field. */
  aliases?: string[];
  /**
   * True when the field must be present above `minConfidence` for the
   * application to auto-advance to `ocr_processed` without manual review.
   */
  required: boolean;
  /**
   * Per-field confidence floor [0-1]. Falls back to `FormSchema.globalMinConfidence`.
   * For multi-select / boolean fields a lower floor is typical (~0.6)
   * because checkbox detection is noisier than printed text.
   */
  minConfidence?: number;
  type: FieldType;
  multiLine?: boolean;
  /** For `type: 'enum'` — acceptable discrete values. */
  enumValues?: string[];
  /**
   * When true AND `type === 'enum'`, the extracted value is a `string[]`
   * instead of a `string`. The mapper splits the raw OCR value on common
   * separators and matches each token against `enumValues`.
   */
  multi?: boolean;
  /**
   * Upper bound on `string[]` length when `multi: true`. The mapper truncates
   * beyond this and records a non-error reason; UI should disable additional
   * selections once the cap is reached.
   */
  maxSelections?: number;
  /**
   * Marks fields that must not appear on consumer-facing surfaces. Admin UI
   * still renders them; consumer views must gate on this flag. No production
   * field currently sets this; reserved for future fields that need
   * admin-only handling. See ADR-013 point 7.
   */
  sensitive?: boolean;
}

export interface FormSchema {
  version: string;
  globalMinConfidence: number;
  fields: FieldSpec[];
  /**
   * Display sections for review UIs, in field order: a section starts at the
   * field whose key matches `firstKey` and runs until the next section (or the
   * end). Optional — schemas without sections render as one flat list. Lives
   * here (not per-field) so adding a field to a section needs no annotation.
   */
  sections?: Array<{ title: string; firstKey: string }>;
}

/**
 * Type guard: true when a field yields `string[]` values.
 *
 * Every consumer reading `ExtractedField.value` should branch through this
 * guard rather than casting — it keeps the string | string[] invariant tied
 * to the schema rather than to scattered runtime checks.
 */
export function isMultiField(
  spec: FieldSpec,
): spec is FieldSpec & { multi: true; enumValues: string[] } {
  return spec.multi === true && spec.type === 'enum';
}

/**
 * Extracted-value invariants:
 *   - When `isMultiField(spec)` is true: `value` is `string[]` or `null`.
 *   - When `spec.type === 'boolean'`: `value` is the literal string
 *     `'true'` or `'false'` (wire-format wart — keeps the mapper simple and
 *     round-trips cleanly through JSONB without type coercion).
 *   - Otherwise: `value` is `string` or `null`.
 */
export interface ExtractedField {
  key: string;
  value: string | string[] | null;
  /** Which label/alias matched on the OCR response (null if no match). */
  matchedLabel: string | null;
  /** min(keyConfidence, valueConfidence) from the matched pair. Null if missing. */
  confidence: number | null;
  /** True when the field was matched but confidence < threshold. */
  belowThreshold: boolean;
  /** True when no pair matched this field at all. */
  missing: boolean;
  /** True when a human should review this row. (`required && (missing || belowThreshold)`) */
  flagged: boolean;
}

export interface MapResult {
  schemaVersion: string;
  fields: ExtractedField[];
  /** True when at least one required field is missing or below threshold. */
  needsManualReview: boolean;
  /** Human-readable reasons for manual review. */
  reasons: string[];
  /**
   * Raw pairs the mapper couldn't match to any schema field. Preserved so the
   * review UI can show "we also saw these labels we didn't recognize."
   */
  rawUnmatched: Array<{ key: string; value: string; keyConfidence: number; valueConfidence: number }>;
}
