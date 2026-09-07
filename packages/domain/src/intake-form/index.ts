export * from './types';
export { PROVISIONAL_INTAKE_FORM_V1 } from './provisional-v1';
export { PRODUCTION_INTAKE_FORM_V1 } from './production-v1';

/**
 * The single import point used by the OCR worker, the intake services, and
 * the admin UI. Swap this assignment to change form versions — no other code
 * changes required as long as the new schema uses existing `FieldType` values.
 *
 * `documents.ocrExtractedFields` is JSONB keyed by `FieldSpec.key`, so
 * flipping schemas does not require a DB migration. Keys removed from the
 * active schema simply stop rendering; orphaned JSONB entries are ignored.
 *
 * History:
 *   - provisional-v1 (2026-04-07 → 2026-04-21): 20-field best guess before
 *     the client delivered the real form. Kept exported for reference.
 *   - production-v1 (2026-04-22 → current): mirrors the 3-page PDF at
 *     `docs/client-assets/intake-form-draft-2026-04-21/`.
 */
import { PRODUCTION_INTAKE_FORM_V1 } from './production-v1';
export const ACTIVE_FORM_SCHEMA = PRODUCTION_INTAKE_FORM_V1;
