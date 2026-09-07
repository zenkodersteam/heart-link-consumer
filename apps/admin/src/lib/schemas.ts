import { z } from 'zod';

export const APPLICATION_STATUSES = [
  'packet_requested',
  'packet_generated',
  'packet_sent',
  'waiting_for_return',
  'returned',
  'scanned',
  'ocr_processed',
  'needs_review',
  'incomplete',
  'verified',
  'rejected',
] as const;

export const TERMINAL_STATUSES = ['verified', 'incomplete', 'rejected'] as const;

export const REVIEW_OUTCOMES = ['approved', 'rejected', 'incomplete'] as const;
export const APPLICATION_SOURCE_CHANNELS = [
  'outreach',
  'mail_request',
  'referral',
  'facility_campaign',
  'staff_created',
] as const;

export const CreateApplicationSchema = z.object({
  facilityId: z.string().uuid(),
  sourceChannel: z.enum(APPLICATION_SOURCE_CHANNELS),
  assignedStaffId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;

export const TransitionSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(APPLICATION_STATUSES),
    reviewOutcome: z.enum(REVIEW_OUTCOMES).optional(),
    reviewNotes: z.string().min(10).max(2000).optional(),
    nextPath: z.string().optional(),
  })
  .refine(
    (d) =>
      !TERMINAL_STATUSES.includes(d.status as (typeof TERMINAL_STATUSES)[number]) ||
      (d.reviewOutcome && d.reviewNotes && d.reviewNotes.length >= 10),
    {
      message: 'Terminal states require reviewOutcome and reviewNotes (≥10 chars)',
    },
  );

export type TransitionInput = z.infer<typeof TransitionSchema>;

/**
 * Field values round-trip through JSONB and support the full FieldType matrix:
 *   - string (free text, enum single-select, boolean-as-"true"/"false", date ISO, number-as-string)
 *   - string[] (multi-select enums)
 *   - null (explicit clear)
 * Payload caps: 2000 chars per string, 20 elements per array, 200 chars per array element.
 */
const FieldValue = z.union([
  z.string().max(2000),
  z.array(z.string().max(200)).max(20),
  z.null(),
]);

export const FieldsSchema = z.object({
  documentId: z.string().uuid(),
  applicationId: z.string().uuid(),
  fields: z.record(z.string(), FieldValue),
});

export type FieldsInput = z.infer<typeof FieldsSchema>;

// =============================================================================
// Profiles (M3 W7)
// =============================================================================

export const PROFILE_STATUSES = [
  'draft',
  'pending_approval',
  'pending_payment',
  'active',
  'paused',
  'expired',
  'removed',
] as const;

export const PROFILE_TERMINAL_STATUSES = ['removed'] as const;

export const UpdateProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().max(120).nullable().optional(),
  dateOfBirth: z.string().max(40).nullable().optional(),
  bio: z.string().max(8000).nullable().optional(),
  locationDescription: z.string().max(255).nullable().optional(),
  releaseDate: z.string().max(40).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const TransitionProfileSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PROFILE_STATUSES),
  notes: z.string().max(2000).optional(),
});
export type TransitionProfileInput = z.infer<typeof TransitionProfileSchema>;

export const ModeratePhotoSchema = z.object({
  profileId: z.string().uuid(),
  photoId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional(),
});
export type ModeratePhotoInput = z.infer<typeof ModeratePhotoSchema>;

export const SetPrimaryPhotoSchema = z.object({
  profileId: z.string().uuid(),
  photoId: z.string().uuid(),
});
export type SetPrimaryPhotoInput = z.infer<typeof SetPrimaryPhotoSchema>;

export const DeletePhotoSchema = SetPrimaryPhotoSchema;
export type DeletePhotoInput = z.infer<typeof DeletePhotoSchema>;

export const BulkModeratePhotosSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional(),
});
export type BulkModeratePhotosInput = z.infer<typeof BulkModeratePhotosSchema>;

// =============================================================================
// Payments (M3 W7)
// =============================================================================

export const PAYMENT_METHODS = [
  'mail_check',
  'mail_money_order',
  'stripe',
  'manual',
] as const;

export const PAYMENT_PURPOSES = ['listing', 'consumer', 'other'] as const;

export const PAYMENT_STATUSES = [
  'received',
  'matched',
  'unmatched',
  'refunded',
  'exception',
] as const;

export const RecordPaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(PAYMENT_METHODS),
  payerName: z.string().min(1).max(255),
  payerEmail: z.string().email().max(255).optional().or(z.literal('').transform(() => undefined)),
  payerPhone: z.string().max(64).optional(),
  receivedDate: z.string().min(1),
  notes: z.string().max(8000).optional(),
  applicationId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

export const MatchPaymentSchema = z
  .object({
    paymentId: z.string().uuid(),
    applicationId: z.string().uuid().optional(),
    profileId: z.string().uuid().optional(),
    subscriptionId: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      [d.applicationId, d.profileId, d.subscriptionId].filter(Boolean).length === 1,
    {
      message: 'Provide exactly one of applicationId, profileId, or subscriptionId',
    },
  );
export type MatchPaymentInput = z.infer<typeof MatchPaymentSchema>;

export const ConfirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  purpose: z.enum(PAYMENT_PURPOSES).optional(),
});
export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;

export const PaymentReasonSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});
export type PaymentReasonInput = z.infer<typeof PaymentReasonSchema>;

// =============================================================================
// Facilities (M3 W8)
// =============================================================================

export const FACILITY_STATUSES = ['active', 'inactive'] as const;

const stateCode = z
  .string()
  .trim()
  .length(2, 'State must be a 2-letter code')
  .transform((s) => s.toUpperCase());

export const CreateFacilitySchema = z.object({
  name: z.string().trim().min(1).max(255),
  state: stateCode,
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(1).max(255),
  zip: z.string().trim().min(3).max(10),
  notes: z.string().trim().max(8000).nullable().optional(),
});
export type CreateFacilityInput = z.infer<typeof CreateFacilitySchema>;

export const UpdateFacilitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(255).optional(),
  state: stateCode.optional(),
  addressLine1: z.string().trim().min(1).max(255).optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(1).max(255).optional(),
  zip: z.string().trim().min(3).max(10).optional(),
  status: z.enum(FACILITY_STATUSES).optional(),
  notes: z.string().trim().max(8000).nullable().optional(),
});
export type UpdateFacilityInput = z.infer<typeof UpdateFacilitySchema>;

// =============================================================================
// Resources (MVP retention lane)
// =============================================================================

const nullableTrimmed = z.string().trim().max(8000).nullable().optional();
const nullableShort = z.string().trim().max(255).nullable().optional();

export const CreateResourceCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must use lowercase letters, numbers, and hyphens'),
  title: z.string().trim().min(1).max(120),
  description: nullableTrimmed,
  icon: nullableShort,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});
export type CreateResourceCategoryInput = z.infer<typeof CreateResourceCategorySchema>;

export const UpdateResourceCategorySchema = CreateResourceCategorySchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateResourceCategoryInput = z.infer<typeof UpdateResourceCategorySchema>;

export const CreateResourceSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  organization: nullableShort,
  description: nullableTrimmed,
  url: z.string().trim().url().max(2048).nullable().optional(),
  phone: z.string().trim().max(64).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(12).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;

export const UpdateResourceSchema = CreateResourceSchema.partial().extend({
  id: z.string().uuid(),
});
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
