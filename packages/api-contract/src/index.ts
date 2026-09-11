export type ApiResponse<T> = {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
};

export type ApiError = {
  message: string;
  code: string;
  statusCode: number;
};

// =============================================================================
// Domain types — mirror API response shapes for consumer apps (admin-web, mobile).
// Kept as plain TS types (not bound to @heartlink/domain) so this package stays
// dependency-free.
// =============================================================================

export type ApplicationStatus =
  | 'packet_requested'
  | 'packet_generated'
  | 'packet_sent'
  | 'waiting_for_return'
  | 'returned'
  | 'scanned'
  | 'ocr_processed'
  | 'needs_review'
  | 'incomplete'
  | 'verified'
  | 'rejected';

export type ApplicationSourceChannel =
  | 'outreach'
  | 'mail_request'
  | 'referral'
  | 'facility_campaign'
  | 'staff_created';

export type ReviewOutcome = 'approved' | 'rejected' | 'incomplete';

export type DocumentType =
  | 'scanned_application'
  | 'photo'
  | 'letter_inbound'
  | 'letter_outbound'
  | 'packet_pdf'
  | 'generated_notice';

export type OcrStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'not_applicable';

export type IntakeIngestionSource =
  | 'staff_upload'
  | 'business_anywhere_scan'
  | 'mailroom_scan'
  | 'operator_upload';

export type IntakeIngestionStatus =
  | 'uploaded'
  | 'ocr_pending'
  | 'review_pending'
  | 'rejected_ingest';

export type FacilityStatus = 'active' | 'inactive';

export interface Facility {
  id: string;
  name: string;
  state: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  zip: string;
  mailingRules: unknown;
  status: FacilityStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacilityInput {
  name: string;
  state: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  zip: string;
  mailingRules?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface UpdateFacilityInput {
  name?: string;
  state?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  zip?: string;
  mailingRules?: Record<string, unknown> | null;
  notes?: string | null;
  status?: FacilityStatus;
}

export interface Application {
  id: string;
  applicationNumber: string;
  facilityId: string;
  sourceChannel: ApplicationSourceChannel;
  status: ApplicationStatus;
  packetVersion: number;
  packetSentDate: string | null;
  packetReturnDate: string | null;
  assignedStaffId: string | null;
  reviewOutcome: ReviewOutcome | null;
  reviewNotes: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Values stored in `documents.ocrExtractedFields.fields`:
 *   - string: free text, single-select enum (canonical value or raw fallback),
 *     boolean-as-"true"/"false", date ISO, number-as-string.
 *   - string[]: multi-select enum fields (`FieldSpec.multi === true`).
 *   - null: explicitly cleared or never present.
 * Keep in sync with `FieldValue` in admin-web `lib/schemas.ts` and
 * `ExtractedFieldValue` in `apps/api/src/documents/dto/document.dto.ts`.
 */
export type ExtractedFieldValue = string | string[] | null;

export interface OcrExtractedFieldsJson {
  _schemaVersion?: string;
  _providerName?: string;
  _reasons?: string[];
  _rawUnmatched?: unknown;
  fields: Record<string, ExtractedFieldValue>;
}

export interface IntakeDocument {
  id: string;
  applicationId: string;
  type: DocumentType;
  s3Bucket: string;
  s3Key: string;
  mimeType: string;
  fileSizeBytes: number | null;
  ocrStatus: OcrStatus;
  ingestionSource: IntakeIngestionSource | null;
  ingestionStatus: IntakeIngestionStatus | null;
  needsManualReview: boolean;
  ocrExtractedFields: OcrExtractedFieldsJson | null;
  ocrConfidenceScores: Record<string, number | null> | null;
  uploadedById: string | null;
  createdAt: string;
  presignedUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorType: 'user' | 'system' | 'automation';
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ListApplicationsQuery {
  status?: ApplicationStatus;
  facilityId?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Case-insensitive substring match on application number or OCR full name. */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ListApplicationsResponse {
  items: Application[];
  total: number;
  limit: number;
  offset: number;
  /**
   * Count per application status with the non-status filters (facility, date
   * range) applied. Backs the intake queue's status tab chips.
   */
  statusCounts: Partial<Record<ApplicationStatus, number>>;
}

export interface CreateApplicationInput {
  facilityId: string;
  sourceChannel: ApplicationSourceChannel;
  assignedStaffId?: string;
}

export interface TransitionApplicationInput {
  status: ApplicationStatus;
  reviewOutcome?: ReviewOutcome;
  reviewNotes?: string;
}

export interface UpdateExtractedFieldsInput {
  fields: Record<string, ExtractedFieldValue>;
}

export interface PresignedUrlResponse {
  url: string;
  ttlSeconds: number;
}

// =============================================================================
// Profiles + photos (M3 W6)
// =============================================================================

export type ProfileStatus =
  | 'draft'
  | 'pending_approval'
  | 'pending_payment'
  | 'active'
  | 'paused'
  | 'expired'
  | 'removed';

export type PhotoModerationStatus = 'pending' | 'approved' | 'rejected';

export type SubscriptionStatus =
  | 'not_started'
  | 'payment_pending'
  | 'active'
  | 'renewal_due'
  | 'grace_period'
  | 'expired'
  | 'suspended';

export interface Profile {
  id: string;
  applicationId: string;
  status: ProfileStatus;
  displayName: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  facilityId: string;
  locationDescription: string | null;
  releaseDate: string | null;
  matchPreferences: unknown;
  primaryPhotoId: string | null;
  isPubliclyVisible: boolean;
  activatedAt: string | null;
  pausedAt: string | null;
  expiredAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePhoto {
  id: string;
  profileId: string;
  documentId: string;
  sortOrder: number;
  moderationStatus: PhotoModerationStatus;
  createdAt: string;
  presignedUrl?: string;
}

export interface PlanFeatures {
  tier?: 'basic' | 'diamond' | 'vip';
  photoLimit?: number;
  bioWordLimit?: number;
  [key: string]: unknown;
}

export interface Plan {
  id: string;
  name: string;
  type: 'inmate_listing' | 'outside_basic' | 'outside_premium';
  priceCents: number;
  billingInterval: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  features: PlanFeatures | null;
  stripePriceId: string | null;
  isActive: boolean;
}

export interface SubscriptionSummary {
  id: string;
  status: SubscriptionStatus;
  planId: string;
  currentPeriodEnd: string | null;
}

// Consumer subscription checkout (M4). Two processors: Stripe (cards / Cash App /
// Venmo / bank) and PayPal (separate processor, ADR-014 Option A). Both share the
// same request/response shape and the same key-absence-safe `configured` contract.
export interface ListPlansResponse {
  plans: Plan[];
}

export interface CreateCheckoutInput {
  planId: string;
  /** Optional profile this listing payment is for; becomes the processor's client/reference id. */
  profileId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  /** Processor-hosted approval URL to redirect to, or null when payments are not configured. */
  url: string | null;
  /** False when the processor is not configured (no keys) — the UI should disable checkout. */
  configured: boolean;
}

export interface CancelSubscriptionResponse {
  cancelled: boolean;
  /**
   * When access actually stops. A cancellation keeps the period already paid
   * for, so this is the end of that period, not now. Null when the provider
   * did not say.
   */
  accessEndsOn: string | null;
}

// ── Fast-follow: engagement + monetization ──────────────────────────────────

export type SwipeAction = 'like' | 'pass' | 'second_look';

export interface RecordSwipeInput {
  action: SwipeAction;
}

export interface SwipeEntitlement {
  allowed: boolean;
  freeRemaining: number | null; // null = unlimited
  creditBalance: number;
  totalRemaining: number | null; // null = unlimited
  capReached: boolean;
  freeDailyCap: number;
}

export interface RecordSwipeResponse {
  recorded: boolean;
  /** True when the action was blocked because the daily cap is reached. */
  capReached: boolean;
  entitlement: SwipeEntitlement;
}

export interface AnalyticsEventInput {
  event: string;
  props?: Record<string, string | number | boolean>;
  anonId?: string;
  source?: 'consumer' | 'admin' | 'api';
}

export interface IngestAnalyticsResponse {
  accepted: number;
  rejected: number;
}

export interface PurchaseSwipesInput {
  /** How many swipe credits to buy (maps to a configured pack price). */
  pack: 'small' | 'medium' | 'large';
  processor: 'stripe' | 'paypal';
  successUrl: string;
  cancelUrl: string;
}

// Outside-user self profile (Phase 4)
export type OutsideProfileStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface OutsideUserProfile {
  id: string;
  displayName: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  location: string | null;
  matchPreferences: unknown;
  primaryPhotoUrl: string | null;
  status: OutsideProfileStatus;
  moderationNotes: string | null;
  /** Durable one-way flag: true once the user has completed onboarding (first
   *  profile submit). Unlike `status`, it never resets on profile edits, so the
   *  consumer gates onboarding on this rather than on live profile fields. */
  onboardingComplete: boolean;
}

export interface UpdateOutsideProfileInput {
  displayName?: string;
  bio?: string;
  dateOfBirth?: string;
  location?: string;
  matchPreferences?: unknown;
}

export interface ModerateOutsideProfileInput {
  decision: 'approved' | 'rejected';
  notes?: string;
}

// Sponsor invites (payer invite loop): sent to the outside payer named on a
// verified intake form; converted when a settled listing payment arrives.
export interface SponsorInviteItem {
  id: string;
  applicationId: string;
  profileId: string;
  profileDisplayName: string | null;
  payerName: string | null;
  payerEmail: string;
  status: string;
  paymentId: string | null;
  convertedAt: string | null;
  createdAt: string;
}

export interface ListSponsorInvitesResponse {
  items: SponsorInviteItem[];
}

// Express interest (Phase 2)
export interface ExpressInterestInput {
  note: string;
}

export interface ExpressInterestResponse {
  status: 'queued' | 'pending_moderation';
  /** False when PostGrid is not configured; the intent is stored and sent later. */
  deliveryConfigured: boolean;
}

export interface ProfilePhotoIntakeStatus {
  submissionMethod: string | null;
  expectedAttachedCount: number | null;
  selectedPhotoNumbers: string[];
  intakePhotoDocumentCount: number;
  profilePhotoCount: number;
  approvedPhotoCount: number;
}

export interface ProfileDetail extends Profile {
  photos: ProfilePhoto[];
  application: { id: string; status: ApplicationStatus } | null;
  plan: Plan | null;
  subscription: SubscriptionSummary | null;
  photoIntake: ProfilePhotoIntakeStatus | null;
}

export type ActivationBlockerCode =
  | 'application_not_verified'
  | 'photos_insufficient'
  | 'listing_payment_unconfirmed'
  | 'moderation_blocked'
  | 'gender_missing';

export interface ActivationBlocker {
  code: ActivationBlockerCode;
  reason: string;
}

export interface ActivationCheckResult {
  ok: boolean;
  /** Human strings, one per blocker, in blocker order. */
  reasons: string[];
  /** Structured counterpart to `reasons`; additive, `reasons` stays authoritative for the UI. */
  blockers?: ActivationBlocker[];
  details: {
    applicationVerified: boolean;
    approvedPhotoCount: number;
    requiredPhotoCount: number | null;
    subscriptionActive: boolean;
  };
}

export interface ListProfilesQuery {
  status?: ProfileStatus;
  facilityId?: string;
  q?: string;
  /** Whether the listing has at least one approved photo. */
  hasPhotos?: 'yes' | 'no';
  /** Whether the listing fee has been confirmed. */
  payment?: 'confirmed' | 'unconfirmed';
  limit?: number;
  offset?: number;
}

export interface ListProfilesResponse {
  items: Profile[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminUserLookupItem {
  id: string;
  displayName: string | null;
  email: string;
}

/**
 * A member as the staff directory lists them.
 *
 * Extends the picker's shape rather than replacing it: the inbound-mail
 * combobox reads only name and email out of the same endpoint, and carries on
 * doing so.
 */
export interface AdminUserRow extends AdminUserLookupItem {
  createdAt: string;
  emailVerifiedAt: string | null;
  /** Whether they have set a password, not what it is. */
  hasPassword: boolean;
  /** Null when they have not started their own profile. */
  profileStatus: OutsideProfileStatus | null;
  /**
   * Their profile photo, or the account avatar when there is none — presigned,
   * so it loads as-is. Optional so an older API that does not send it still
   * satisfies the type.
   */
  photoUrl?: string | null;
}

export interface ListAdminUsersQuery {
  q?: string;
  limit?: number;
  offset?: number;
  /** 'none' finds members who have not begun a profile. */
  status?: OutsideProfileStatus | 'none';
}

export interface ListAdminUsersResponse {
  items: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
}

/** A phone or tablet registered for notifications. */
export interface AdminUserDevice {
  id: string;
  platform: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Set when the push service reported the device as gone. */
  disabledAt: string | null;
}

export interface AdminUserPayment {
  id: string;
  /** Null until staff assign one, which happens on matching. */
  paymentNumber: string | null;
  amountCents: number;
  status: PaymentStatus;
  purpose: PaymentPurpose | null;
  receivedDate: string | null;
}

/**
 * Everything staff need about one member on a single screen.
 *
 * Deliberately no password field of any kind, not even a hash: nothing on an
 * admin screen ever needs one, and a value that is never displayed is a value
 * that should never be sent. `hasPassword` and when it was set is the whole of
 * what support actually asks.
 */
export interface AdminUserDetail {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  onboardingStatus: string | null;
  emailVerifiedAt: string | null;
  hasPassword: boolean;
  passwordSetAt: string | null;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  createdAt: string;
  profile: {
    status: OutsideProfileStatus;
    displayName: string | null;
    primaryPhotoUrl: string | null;
    moderationNotes: string | null;
    submittedAt: string | null;
    reviewedAt: string | null;
  } | null;
  subscription: {
    status: SubscriptionStatus;
    planName: string | null;
    currentPeriodEnd: string | null;
    renewalDate: string | null;
  } | null;
  letters: {
    creditBalance: number;
    sentTotal: number;
    sentThisMonth: number;
  };
  activity: {
    threadCount: number;
    savedProfileCount: number;
    paymentTotalCents: number;
  };
  devices: AdminUserDevice[];
  payments: AdminUserPayment[];
}

export interface UpdateProfileInput {
  displayName?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  locationDescription?: string | null;
  releaseDate?: string | null;
  matchPreferences?: unknown;
}

export interface TransitionProfileInput {
  status: ProfileStatus;
  notes?: string;
}

export interface ModeratePhotoInput {
  status: 'approved' | 'rejected';
  notes?: string;
}

// =============================================================================
// Payments (M3 W7)
// =============================================================================

export type PaymentStatus =
  | 'received'
  | 'matched'
  | 'confirmed'
  | 'unmatched'
  | 'refunded'
  | 'exception';

export type PaymentMethod = 'mail_check' | 'mail_money_order' | 'stripe' | 'paypal' | 'manual';

// Phase 1: `listing` money gates inmate profile activation, `consumer` money is
// outside-user product purchases. Null on payments recorded before Phase 1.
export type PaymentPurpose = 'listing' | 'consumer' | 'other';

export interface Payment {
  id: string;
  paymentNumber: string;
  applicationId: string | null;
  profileId: string | null;
  subscriptionId: string | null;
  userId: string | null;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  purpose: PaymentPurpose | null;
  payerName: string;
  payerEmail: string | null;
  payerPhone: string | null;
  stripePaymentIntentId: string | null;
  matchedById: string | null;
  matchedAt: string | null;
  confirmedById: string | null;
  confirmedAt: string | null;
  notes: string | null;
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchedEntitySummary {
  applicationId: string | null;
  applicationNumber: string | null;
  profileId: string | null;
  profileDisplayName: string | null;
  subscriptionId: string | null;
}

export interface PaymentDetail extends Payment {
  matched: MatchedEntitySummary | null;
}

export interface ListPaymentsQuery {
  // One status, or several (serialized comma-separated) for attention buckets
  // like the admin "Unmatched" tab = received + unmatched.
  status?: PaymentStatus | PaymentStatus[];
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ListPaymentsResponse {
  items: Payment[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaymentCounts {
  all: number;
  received: number;
  unmatched: number;
  matched: number;
  confirmed: number;
  exception: number;
  refunded: number;
}

export interface RecordPaymentInput {
  amountCents: number;
  method: PaymentMethod;
  payerName: string;
  payerEmail?: string;
  payerPhone?: string;
  receivedDate: string;
  notes?: string;
  purpose?: PaymentPurpose;
  applicationId?: string;
  profileId?: string;
  subscriptionId?: string;
}

/** Body for PUT /admin/payments/:id/confirm. */
export interface ConfirmPaymentInput {
  /** Optional staff note recorded on the audit entry. */
  notes?: string;
  /** Set/override the payment purpose at confirm time. */
  purpose?: PaymentPurpose;
}

export interface MatchPaymentInput {
  applicationId?: string;
  profileId?: string;
  subscriptionId?: string;
}

export interface PaymentReasonInput {
  reason: string;
}

export interface MatchSuggestion {
  applicationId: string | null;
  applicationNumber: string | null;
  profileId: string | null;
  profileDisplayName: string | null;
  subscriptionId: string | null;
  facilityId: string | null;
  facilityName: string | null;
  status: string;
  expectedAmountCents: number | null;
  matchScore: number;
}

export interface MatchSuggestionsResponse {
  items: MatchSuggestion[];
}

// =============================================================================
// Pending photo queue (M3 W7)
// =============================================================================

export interface PendingPhoto extends ProfilePhoto {
  profileDisplayName: string | null;
  facilityId: string | null;
  facilityName: string | null;
}

export interface ListPendingPhotosQuery {
  facilityId?: string;
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}

export interface ListPendingPhotosResponse {
  items: PendingPhoto[];
  total: number;
  limit: number;
  offset: number;
}

export interface BulkModeratePhotosInput {
  photoIds: string[];
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface BulkModeratePhotosResponse {
  updated: number;
}

// =============================================================================
// Navigation counts (M3 W7) — feeds sidebar attention badges.
// =============================================================================

export interface NavCounts {
  intake: number;
  profiles: number;
  payments: number;
  moderation: number;
  /** Letters written by members and waiting to be approved before posting. */
  letters: number;
  /**
   * Outbound post: every letter on its way out, new since this section was
   * last opened.
   *
   * Overlaps `letters` on purpose. A letter awaiting approval is counted by
   * both, because it is genuinely in both places - the approval queue and the
   * post pipeline - and the Outbound Mail page lists it either way. A badge
   * that disagreed with the page under it would be the worse of the two.
   *
   * There is no inbound counterpart: inbound mail is a scan-upload form with a
   * single POST endpoint, not a queue, so it has nothing waiting to count.
   */
  outboundMail: number;
  /**
   * People who have signed up since this section was last opened.
   *
   * Members are `outside_user` accounts — the people writing letters in, as
   * opposed to the listings they write to, which are counted by `profiles`.
   */
  members: number;
}

// =============================================================================
// Dashboard recent activity feed (M3 W8) — cross-entity audit-log digest for
// the admin /dashboard surface. Backs the "Recent Activity" card.
// =============================================================================

export type RecentActivityEntityType =
  | 'application'
  | 'profile'
  | 'profile_photo'
  | 'payment'
  | 'document'
  | 'other';

export interface RecentActivityEntry {
  id: string;
  action: string;
  label: string;
  actorType: 'user' | 'system' | 'automation';
  actorDisplayName: string | null;
  entityType: RecentActivityEntityType;
  entityId: string;
  entityLabel: string | null;
  href: string | null;
  createdAt: string;
}

export interface RecentActivityResponse {
  items: RecentActivityEntry[];
}

// =============================================================================
// Dashboard membership metrics — profiles by state, 30-day pipeline, and plan
// mix. Backs the admin /dashboard "Membership metrics" card.
// =============================================================================

export interface StateCount {
  state: string;
  count: number;
}

export interface DashboardMetrics {
  /** Active profiles grouped by facility state, descending. */
  profilesByState: StateCount[];
  /** Rolling 30-day operational pipeline. */
  pipeline: {
    applicationsReceived: number;
    profilesActivated: number;
    paymentsMatched: number;
    photosModerated: number;
  };
  /** Active subscriptions per plan (by plan name) + payment-pending count. */
  planMix: {
    plans: { name: string; count: number }[];
    paymentPending: number;
    totalActive: number;
  };
}

// =============================================================================
// Public consumer profile browse (M3 W8) — feeds the M4 consumer app.
// Returns only profiles where status='active' AND isPubliclyVisible=true.
// =============================================================================

export type PlanTier = 'basic' | 'diamond' | 'vip';

// Facility `name` and `city` are intentionally NOT exposed on the public
// consumer surface (2026-06-16 client decision: do not reveal which facility a
// profile is at, for safety + engagement). Only the coarse `state` is surfaced.
export interface PublicProfileFacility {
  id: string;
  state: string;
}

export interface PublicProfilePhoto {
  id: string;
  presignedUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface PublicProfileSummary {
  id: string;
  displayName: string;
  age: number | null;
  bioExcerpt: string | null;
  facility: PublicProfileFacility;
  planTier: PlanTier | null;
  /** True only when staff recorded a completed identity check. */
  isVerified: boolean;
  primaryPhotoUrl: string | null;
  photoCount: number;
  activatedAt: string | null;
}

export interface PublicProfileDetail extends PublicProfileSummary {
  bio: string | null;
  releaseDate: string | null;
  locationDescription: string | null;
  matchPreferences: unknown;
  photos: PublicProfilePhoto[];
  /** Whether this inmate accepts mail (profile-card "Accepts Mail" row). Real
   *  column on profiles; defaults true. Replaces the old hard-coded constant. */
  acceptsMail: boolean;
  /** Interests for the profile card, sourced from the intake OCR `interests`
   *  field (multi-select, ≤5). Empty array when none captured. */
  interests: string[];
}

export type ProfileGender = 'male' | 'female';

export interface ListPublicProfilesQuery {
  ageMin?: number;
  ageMax?: number;
  state?: string;
  facilityId?: string;
  planTier?: PlanTier;
  gender?: ProfileGender;
  limit?: number;
  offset?: number;
}

export interface ListPublicProfilesResponse {
  items: PublicProfileSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListSavedProfilesResponse {
  items: PublicProfileSummary[];
  total: number;
}

// =============================================================================
// Secure Mailbox — PostGrid letter correspondence (outside_user).
//
// Outbound = a typed letter we print + mail via PostGrid to the inmate's
// facility; inbound = the inmate's reply, scanned in by staff. NOT real-time
// chat. Monetized via a plan-included monthly allowance + purchased letter
// credits (see LetterEntitlement) — mirrors the swipe credits engine.
// =============================================================================

export type MailDirection = 'inbound' | 'outbound';

export interface MailboxMessage {
  id: string;
  threadId: string;
  direction: MailDirection;
  subject: string | null;
  body: string | null;
  /** Outbound-letter review state (reuses the photo moderation rubric). */
  moderationStatus: PhotoModerationStatus;
  /** PostGrid delivery lifecycle for outbound letters; null for inbound.
   *  Common values: queued|submitted|printing|in_transit|delivered|returned|failed. */
  deliveryStatus: string | null;
  /** Presigned URL to the scanned artifact for inbound (scanned_letter) messages;
   *  null for outbound letters and inbound rows without a stored scan. */
  scanUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface MailboxThreadSummary {
  threadId: string;
  profileId: string;
  profileDisplayName: string;
  profilePhotoUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastDirection: MailDirection | null;
  unreadCount: number;
}

export interface MailboxThreadDetail {
  threadId: string;
  profileId: string;
  profileDisplayName: string;
  profilePhotoUrl: string | null;
  messages: MailboxMessage[];
}

export interface ListMailboxThreadsResponse {
  items: MailboxThreadSummary[];
  total: number;
}

/** Letter entitlement for the compose UI. Parallels SwipeEntitlement but the
 *  allowance is per calendar month and `unlimited` surfaces as null fields. */
export interface LetterEntitlement {
  allowed: boolean;
  includedRemaining: number | null; // null = unlimited
  creditBalance: number;
  totalRemaining: number | null; // null = unlimited
  capReached: boolean;
  /** The user's plan-included letters per month (0 when no active plan). */
  includedPerPeriod: number;
}

export interface ComposeLetterInput {
  subject?: string;
  body: string;
}

export interface ComposeLetterResponse {
  sent: boolean;
  /** True when blocked because the monthly allowance + credits are exhausted. */
  capReached: boolean;
  entitlement: LetterEntitlement;
  /** False when PostGrid is not configured: the letter is stored queued and
   *  mailed once the integration is enabled (mirrors express-interest). */
  deliveryConfigured: boolean;
  message: MailboxMessage | null;
}

export interface PurchaseLettersInput {
  /** Which letter-credit pack to buy (maps to a configured pack price). */
  pack: 'small' | 'medium' | 'large';
  processor: 'stripe' | 'paypal';
  successUrl: string;
  cancelUrl: string;
}

/** Staff-supplied match for an inbound scanned inmate reply (multipart body, the
 *  scan file is the `file` field). Both ids are required — see below. */
export interface RecordInboundScanInput {
  /** The inmate profile the reply is from. */
  profileId: string;
  /** The outside user (internal users.id) the reply is to. */
  userId: string;
  subject?: string;
}

/** Result of associating an inbound scan: the created inbound message plus the
 *  thread it joined and the persisted scan document. */
export interface RecordInboundScanResponse {
  message: MailboxMessage;
  threadId: string;
  documentId: string;
}

export interface PendingCommunicationItem {
  id: string;
  threadId: string;
  profileId: string;
  profileDisplayName: string;
  subject: string | null;
  body: string | null;
  createdAt: string;
}

export interface ListPendingCommunicationsResponse {
  items: PendingCommunicationItem[];
  total: number;
}

// =============================================================================
// Facility import (M8) — a spreadsheet of facilities, checked before anything
// is written and previewed before it is committed.
// =============================================================================

export interface FacilityImportInput {
  /** The spreadsheet, as text. */
  csv: string;
  /** False (the default) checks and reports without writing anything. */
  commit?: boolean;
}

export interface FacilityImportRowResult {
  line: number;
  outcome: 'ready' | 'duplicate' | 'error';
  name: string | null;
  problems: string[];
}

export interface FacilityImportResponse {
  /** True when rows were actually written. */
  committed: boolean;
  ready: number;
  duplicates: number;
  errors: number;
  /** How many were created. Zero on a dry run. */
  created: number;
  rows: FacilityImportRowResult[];
}

// =============================================================================
// Activity history (M8) — a searchable, filterable view over every audited
// action, replacing a fixed window of the most recent few.
// =============================================================================

export interface ActivityEntry {
  id: string;
  action: string;
  /** Plain-language rendering of `action`, for people rather than code. */
  label: string;
  actorName: string | null;
  actorType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListActivityQuery {
  action?: string;
  entityType?: string;
  entityId?: string;
  /** Free text over the actor's name and email. */
  q?: string;
  /** ISO dates. `dateTo` is inclusive of the whole day. */
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ListActivityResponse {
  items: ActivityEntry[];
  total: number;
  limit: number;
  offset: number;
  /** Every action present in the log, so a filter can offer real choices. */
  actions: string[];
}

// =============================================================================
// Moderation flags (M8) — the queue staff work through when something is
// reported, and the record of what was decided.
// =============================================================================

export type FlagStatus = 'open' | 'investigating' | 'escalated' | 'resolved';
export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FlagEntityType = 'profile' | 'photo' | 'communication' | 'user';

export interface ModerationFlag {
  id: string;
  entityType: FlagEntityType;
  entityId: string;
  /** Display name of the thing flagged, when it has one. */
  entityLabel: string | null;
  reason: string;
  severity: FlagSeverity;
  status: FlagStatus;
  reportedByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  resolutionNotes: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListModerationFlagsQuery {
  status?: FlagStatus;
  severity?: FlagSeverity;
  entityType?: FlagEntityType;
  /** Only flags assigned to this person; 'me' resolves to the caller. */
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface ListModerationFlagsResponse {
  items: ModerationFlag[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateModerationFlagInput {
  status?: FlagStatus;
  severity?: FlagSeverity;
  /** User id to assign to, `'me'` for the caller, or null to unassign. */
  assignedToId?: string | null;
  /** Required when resolving: what was decided and why. */
  resolutionNotes?: string;
}

export interface ModerateCommunicationInput {
  status: 'approved' | 'rejected';
}

// =============================================================================
// Outbound Mail (admin/staff) — read-only queue visibility over the outbound
// letters the mailbox generates. Staff watch the fulfillment leg (queued →
// in transit → delivered/returned); compose + production activation stay
// external until PostGrid is wired live (deliveryConfigured=false).
// =============================================================================

/** The four pipeline buckets PostGrid delivery statuses collapse into for the
 *  admin queue. Unknown/absent statuses read as `queued`. */
export type OutboundMailStage = 'queued' | 'in_transit' | 'delivered' | 'returned';

export interface OutboundMailCounts {
  all: number;
  queued: number;
  in_transit: number;
  delivered: number;
  returned: number;
}

export interface OutboundMailItem {
  id: string;
  threadId: string;
  profileId: string;
  profileDisplayName: string;
  subject: string | null;
  preview: string | null;
  /** Raw PostGrid delivery status (or null before dispatch). */
  deliveryStatus: string | null;
  /** The pipeline bucket `deliveryStatus` collapses into. */
  stage: OutboundMailStage;
  createdAt: string;
}

export interface ListOutboundMailQuery {
  stage?: OutboundMailStage;
  limit?: number;
  offset?: number;
}

export interface ListOutboundMailResponse {
  items: OutboundMailItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface OutboundMailSummary {
  counts: OutboundMailCounts;
  /** Newest outbound letters for the queue preview (most recent first). */
  recent: OutboundMailItem[];
  /** False until PostGrid is wired live — keeps compose/actions disabled. */
  deliveryConfigured: boolean;
  /** Human-readable blockers explaining why outbound delivery is not live yet. */
  deliveryIssues?: string[];
}

// =============================================================================
// Resources directory — admin-managed content with Postgres full-text search.
// Public read surface backs the consumer Resources screen; admin CRUD curates it.
// =============================================================================

export interface ResourceCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface ResourceItem {
  id: string;
  categoryId: string;
  categorySlug: string;
  title: string;
  organization: string | null;
  description: string | null;
  url: string | null;
  phone: string | null;
  tags: string[];
}

export interface ListResourcesQuery {
  categorySlug?: string;
  /** Full-text search across title / organization / description. */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ListResourcesResponse {
  categories: ResourceCategory[];
  items: ResourceItem[];
  total: number;
}

// ── Resources admin CRUD ────────────────────────────────────────────────────

export interface AdminResource extends ResourceItem {
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminResourceCategory extends ResourceCategory {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListAdminResourcesResponse {
  items: AdminResource[];
  total: number;
}

export interface CreateResourceInput {
  categoryId: string;
  title: string;
  organization?: string | null;
  description?: string | null;
  url?: string | null;
  phone?: string | null;
  tags?: string[];
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateResourceInput {
  categoryId?: string;
  title?: string;
  organization?: string | null;
  description?: string | null;
  url?: string | null;
  phone?: string | null;
  tags?: string[];
  isPublished?: boolean;
  sortOrder?: number;
}

export interface CreateResourceCategoryInput {
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateResourceCategoryInput {
  slug?: string;
  title?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}
