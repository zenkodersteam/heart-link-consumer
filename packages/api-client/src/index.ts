import type {
  ActivationCheckResult,
  AdminResource,
  AdminResourceCategory,
  ApiError,
  Application,
  AuditLogEntry,
  BulkModeratePhotosInput,
  BulkModeratePhotosResponse,
  ComposeLetterInput,
  ComposeLetterResponse,
  ConfirmPaymentInput,
  CreateApplicationInput,
  CreateCheckoutInput,
  CreateCheckoutResponse,
  CreateFacilityInput,
  CreateResourceCategoryInput,
  CreateResourceInput,
  DashboardMetrics,
  Facility,
  IntakeDocument,
  LetterEntitlement,
  ListAdminResourcesResponse,
  ListApplicationsQuery,
  ListApplicationsResponse,
  ListAdminUsersQuery,
  ListAdminUsersResponse,
  AdminUserDetail,
  ListMailboxThreadsResponse,
  ListOutboundMailQuery,
  ListOutboundMailResponse,
  ListPaymentsQuery,
  ListPaymentsResponse,
  ListPendingPhotosQuery,
  ListPendingPhotosResponse,
  ListPlansResponse,
  ListProfilesQuery,
  ListProfilesResponse,
  ListPublicProfilesQuery,
  ListPublicProfilesResponse,
  ListResourcesQuery,
  ListResourcesResponse,
  MailboxMessage,
  MailboxThreadDetail,
  FacilityImportInput,
  FacilityImportResponse,
  ListActivityQuery,
  ListActivityResponse,
  ListModerationFlagsQuery,
  ListModerationFlagsResponse,
  ListPendingCommunicationsResponse,
  ModerationFlag,
  UpdateModerationFlagInput,
  MatchPaymentInput,
  MatchSuggestionsResponse,
  ModeratePhotoInput,
  ModerateCommunicationInput,
  ModerateOutsideProfileInput,
  OutsideUserProfile,
  ListSponsorInvitesResponse,
  NavCounts,
  OutboundMailSummary,
  Payment,
  PaymentCounts,
  Plan,
  PaymentDetail,
  PaymentReasonInput,
  PresignedUrlResponse,
  Profile,
  ProfileDetail,
  ProfilePhoto,
  PublicProfileDetail,
  PurchaseLettersInput,
  RecentActivityResponse,
  RecordInboundScanResponse,
  RecordPaymentInput,
  TransitionApplicationInput,
  TransitionProfileInput,
  UpdateExtractedFieldsInput,
  UpdateFacilityInput,
  UpdateProfileInput,
  UpdateResourceCategoryInput,
  UpdateResourceInput,
} from '@heartlink/api-contract';

export { type ApiResponse, type ApiError } from '@heartlink/api-contract';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.API_BASE_URL ??
  'http://localhost:3000';

export interface ApiClientOptions {
  baseUrl: string;
  /** Clerk JWT. Omit for @Public() routes. */
  token?: string | null;
  /**
   * Optional global cache behavior for fetch (Next.js RSC). Defaults to 'no-store'
   * to match admin dashboards — always fresh data.
   */
  cache?: RequestCache;
}

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly body: unknown;
  constructor(statusCode: number, code: string, message: string, body: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.body = body;
  }
}

/**
 * Typed client for the HeartLink admin API.
 *
 * Reads use `cache: 'no-store'` by default (opinion: admin UI is always live).
 * Mutations bypass cache unconditionally. Every request attaches the provided
 * Clerk JWT as `Authorization: Bearer <token>`.
 */
export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const defaultCache: RequestCache = options.cache ?? 'no-store';

  async function request<T>(
    path: string,
    init: RequestInit & { cache?: RequestCache } = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    if (options.token) {
      headers.set('Authorization', `Bearer ${options.token}`);
    }
    if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      cache: init.cache ?? defaultCache,
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      const msg =
        (body as ApiError | null)?.message ??
        (typeof body === 'string' ? body : `HTTP ${res.status}`);
      throw new ApiClientError(res.status, String(res.status), msg, body);
    }

    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  function buildQuery(q: Record<string, unknown> | undefined): string {
    if (!q) return '';
    const pairs: string[] = [];
    for (const [k, v] of Object.entries(q)) {
      if (v === undefined || v === null || v === '') continue;
      const serialized = Array.isArray(v) ? v.join(',') : String(v);
      if (serialized === '') continue;
      pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(serialized)}`);
    }
    return pairs.length ? `?${pairs.join('&')}` : '';
  }

  return {
    // Applications
    async listApplications(query?: ListApplicationsQuery): Promise<ListApplicationsResponse> {
      return request<ListApplicationsResponse>(
        `/admin/intake/applications${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async getApplication(id: string): Promise<Application & { documents: IntakeDocument[] }> {
      return request(`/admin/intake/applications/${id}`);
    },
    async getApplicationHistory(id: string): Promise<AuditLogEntry[]> {
      return request(`/admin/intake/applications/${id}/history`);
    },
    async createApplication(input: CreateApplicationInput): Promise<Application> {
      return request('/admin/intake/applications', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async transitionApplication(
      id: string,
      input: TransitionApplicationInput,
    ): Promise<Application> {
      return request(`/admin/intake/applications/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    // Facilities
    /** Check or import a spreadsheet of facilities. */
    async importFacilities(input: FacilityImportInput): Promise<FacilityImportResponse> {
      return request('/admin/facilities/import', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async listFacilities(): Promise<Facility[]> {
      return request('/admin/facilities');
    },
    async getFacility(id: string): Promise<Facility> {
      return request(`/admin/facilities/${id}`);
    },
    async createFacility(input: CreateFacilityInput): Promise<Facility> {
      return request('/admin/facilities', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility> {
      return request(`/admin/facilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    // Documents
    async listApplicationDocuments(applicationId: string): Promise<IntakeDocument[]> {
      return request(`/admin/intake/applications/${applicationId}/documents`);
    },
    async getDocumentPresignedUrl(documentId: string): Promise<PresignedUrlResponse> {
      return request(`/admin/documents/${documentId}/presigned-url`);
    },
    async uploadApplicationDocument(
      applicationId: string,
      file: File,
      options: {
        type?: 'scanned_application' | 'photo' | 'letter_inbound';
        ingestionSource?: 'staff_upload' | 'business_anywhere_scan' | 'mailroom_scan' | 'operator_upload';
      } = {},
    ): Promise<IntakeDocument> {
      const fd = new FormData();
      fd.append('type', options.type ?? 'scanned_application');
      if (options.ingestionSource) fd.append('ingestionSource', options.ingestionSource);
      fd.append('file', file);
      return request(`/admin/intake/applications/${applicationId}/documents`, {
        method: 'POST',
        body: fd,
      });
    },
    async updateDocumentFields(
      documentId: string,
      input: UpdateExtractedFieldsInput,
    ): Promise<IntakeDocument> {
      return request(`/admin/documents/${documentId}/extracted-fields`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    // Profiles
    async listProfiles(query?: ListProfilesQuery): Promise<ListProfilesResponse> {
      return request<ListProfilesResponse>(
        `/admin/profiles${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async listAdminUsers(
      query?: ListAdminUsersQuery,
    ): Promise<ListAdminUsersResponse> {
      return request<ListAdminUsersResponse>(
        `/admin/users${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async getAdminUser(id: string): Promise<AdminUserDetail> {
      return request<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
    },
    async getProfile(id: string): Promise<ProfileDetail> {
      return request(`/admin/profiles/${id}`);
    },
    async updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
      return request(`/admin/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async transitionProfile(
      id: string,
      input: TransitionProfileInput,
    ): Promise<Profile> {
      return request(`/admin/profiles/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async checkProfileActivation(id: string): Promise<ActivationCheckResult> {
      return request(`/admin/profiles/${id}/activation-check`);
    },
    async activateProfile(id: string): Promise<Profile> {
      return request(`/admin/profiles/${id}/activate`, { method: 'POST' });
    },
    async getProfileHistory(id: string): Promise<AuditLogEntry[]> {
      return request(`/admin/profiles/${id}/history`);
    },

    // Photos
    async listProfilePhotos(profileId: string): Promise<ProfilePhoto[]> {
      return request(`/admin/profiles/${profileId}/photos`);
    },
    async moderateProfilePhoto(
      profileId: string,
      photoId: string,
      input: ModeratePhotoInput,
    ): Promise<ProfilePhoto> {
      return request(`/admin/profiles/${profileId}/photos/${photoId}/moderation`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async setPrimaryProfilePhoto(profileId: string, photoId: string): Promise<Profile> {
      return request(`/admin/profiles/${profileId}/photos/${photoId}/primary`, {
        method: 'PUT',
      });
    },
    async deleteProfilePhoto(profileId: string, photoId: string): Promise<void> {
      return request(`/admin/profiles/${profileId}/photos/${photoId}`, {
        method: 'DELETE',
      });
    },
    async uploadProfilePhoto(profileId: string, file: File): Promise<ProfilePhoto> {
      const fd = new FormData();
      fd.append('file', file);
      return request(`/admin/profiles/${profileId}/photos`, {
        method: 'POST',
        body: fd,
      });
    },
    async importIntakeProfilePhotos(profileId: string): Promise<{ imported: number }> {
      return request(`/admin/profiles/${profileId}/photos/import-intake`, {
        method: 'POST',
      });
    },

    // Cross-profile photo review queue
    async listPendingPhotos(
      query?: ListPendingPhotosQuery,
    ): Promise<ListPendingPhotosResponse> {
      return request<ListPendingPhotosResponse>(
        `/admin/profiles/photo-review${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async bulkModeratePhotos(
      input: BulkModeratePhotosInput,
    ): Promise<BulkModeratePhotosResponse> {
      return request('/admin/profiles/bulk-moderate', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    // Payments
    async listPayments(query?: ListPaymentsQuery): Promise<ListPaymentsResponse> {
      return request<ListPaymentsResponse>(
        `/admin/payments${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async getPaymentCounts(
      query?: Pick<ListPaymentsQuery, 'method' | 'dateFrom' | 'dateTo' | 'q'>,
    ): Promise<PaymentCounts> {
      return request(`/admin/payments/counts${buildQuery(query as Record<string, unknown>)}`);
    },
    async getPayment(id: string): Promise<PaymentDetail> {
      return request(`/admin/payments/${id}`);
    },
    async recordPayment(input: RecordPaymentInput): Promise<Payment> {
      return request('/admin/payments', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async matchPayment(id: string, input: MatchPaymentInput): Promise<Payment> {
      return request(`/admin/payments/${id}/match`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async confirmPayment(
      id: string,
      input: ConfirmPaymentInput = {},
    ): Promise<Payment> {
      return request(`/admin/payments/${id}/confirm`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async markPaymentException(
      id: string,
      input: PaymentReasonInput,
    ): Promise<Payment> {
      return request(`/admin/payments/${id}/exception`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async refundPayment(
      id: string,
      input: PaymentReasonInput,
    ): Promise<Payment> {
      return request(`/admin/payments/${id}/refund`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    async markPaymentUnmatched(id: string): Promise<Payment> {
      return request(`/admin/payments/${id}/unmatched`, { method: 'PUT' });
    },
    async listMatchSuggestions(
      paymentId: string,
      q?: string,
    ): Promise<MatchSuggestionsResponse> {
      return request<MatchSuggestionsResponse>(
        `/admin/payments/${paymentId}/suggestions${buildQuery({ q })}`,
      );
    },

    // Nav badge counts
    // ── Operational settings (return address + plan entitlements) ───────────
    // Both are values the client tweaks; they live in app_config / plans rather
    // than env so a change never needs a deploy.
    async getMailFromSettings(): Promise<{
      stored: MailFromAddressInput | null;
      resolved: Record<string, string | undefined>;
      configured: boolean;
      issues: string[];
      source: 'app_config' | 'env';
    }> {
      return request('/admin/settings/mail-from');
    },
    async setMailFromSettings(
      input: MailFromAddressInput,
    ): Promise<{ resolved: Record<string, string | undefined>; configured: boolean; issues: string[] }> {
      return request('/admin/settings/mail-from', { method: 'PUT', body: JSON.stringify(input) });
    },
    /** Put a failed or returned letter back in the queue. */
    async resendLetter(communicationId: string): Promise<unknown> {
      return request(`/admin/outbound-mail/${encodeURIComponent(communicationId)}/resend`, {
        method: 'POST',
      });
    },
    async dispatchQueuedLetters(): Promise<{
      attempted: number;
      dispatched: number;
      failed: number;
      blocked: string[];
      results: Array<{ id: string; letterId?: string; error?: string }>;
    }> {
      return request('/admin/settings/dispatch-queued', { method: 'POST' });
    },
    /** Put a scan whose text could not be read back through recognition. */
    async retryDocumentOcr(documentId: string): Promise<IntakeDocument> {
      return request(`/admin/documents/${documentId}/ocr-retry`, { method: 'POST' });
    },
    async listPlanSettings(): Promise<{ plans: PlanSetting[] }> {
      return request('/admin/settings/plans');
    },
    async updatePlanSettings(
      id: string,
      input: UpdatePlanSettingInput,
    ): Promise<PlanSetting> {
      return request(`/admin/settings/plans/${id}`, { method: 'PUT', body: JSON.stringify(input) });
    },

    /** The full audit trail, paged and filterable. */
    async listActivity(query?: ListActivityQuery): Promise<ListActivityResponse> {
      return request(`/admin/activity${buildQuery(query as Record<string, unknown>)}`);
    },
    async getNavCounts(): Promise<NavCounts> {
      return request('/admin/nav/counts');
    },
    /** Clear a section's badge by recording that it has just been opened. */
    async markNavSectionSeen(section: string): Promise<{ section: string; seenAt: string }> {
      return request(`/admin/nav/seen/${encodeURIComponent(section)}`, { method: 'POST' });
    },

    // Dashboard recent activity (M3 W8)
    async getRecentActivity(limit?: number): Promise<RecentActivityResponse> {
      return request<RecentActivityResponse>(
        `/admin/dashboard/recent-activity${buildQuery({ limit })}`,
      );
    },

    // Dashboard membership metrics
    async getDashboardMetrics(): Promise<DashboardMetrics> {
      return request<DashboardMetrics>('/admin/dashboard/metrics');
    },

    // Outbound mail admin queue
    async getOutboundMailSummary(): Promise<OutboundMailSummary> {
      return request('/admin/outbound-mail/summary');
    },
    async listOutboundMail(
      query?: ListOutboundMailQuery,
    ): Promise<ListOutboundMailResponse> {
      return request<ListOutboundMailResponse>(
        `/admin/outbound-mail${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async listPendingCommunications(): Promise<ListPendingCommunicationsResponse> {
      return request('/admin/communications/moderation');
    },
    /** The flag queue: what has been reported and where each report has got to. */
    async listModerationFlags(
      query?: ListModerationFlagsQuery,
    ): Promise<ListModerationFlagsResponse> {
      return request(
        `/admin/moderation/flags${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    /** Assign, re-grade, escalate or resolve one report. */
    async updateModerationFlag(
      id: string,
      input: UpdateModerationFlagInput,
    ): Promise<ModerationFlag> {
      return request(`/admin/moderation/flags/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },

    // Outside-user profile moderation queue (consumer self-profiles)
    async listPendingOutsideProfiles(): Promise<OutsideUserProfile[]> {
      return request('/admin/moderation/outside-profiles');
    },
    async moderateOutsideProfile(
      id: string,
      input: ModerateOutsideProfileInput,
    ): Promise<OutsideUserProfile> {
      return request(`/admin/moderation/outside-profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    // Sponsor invites (payer invite loop): outstanding vs converted
    async listSponsorInvites(): Promise<ListSponsorInvitesResponse> {
      return request('/admin/payments/sponsor-invites');
    },
    async recordInboundScan(formData: FormData): Promise<RecordInboundScanResponse> {
      return request<RecordInboundScanResponse>('/admin/inbound-mail/scan', {
        method: 'POST',
        body: formData,
      });
    },
    async moderateCommunication(
      id: string,
      input: ModerateCommunicationInput,
    ): Promise<MailboxMessage> {
      return request(`/admin/communications/${id}/moderation`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    // Public consumer profile browse (M3 W8) — consumer app + outside_user role.
    async listPublicProfiles(
      query?: ListPublicProfilesQuery,
    ): Promise<ListPublicProfilesResponse> {
      return request<ListPublicProfilesResponse>(
        `/api/profiles${buildQuery(query as Record<string, unknown>)}`,
      );
    },
    async getPublicProfile(id: string): Promise<PublicProfileDetail> {
      return request(`/api/profiles/${id}`);
    },

    // Consumer subscriptions (M4) — outside_user role. Checkout degrades
    // gracefully: when Stripe is not configured the response carries
    // `configured: false` and a null url instead of erroring the client.
    async listPlans(type?: Plan['type']): Promise<ListPlansResponse> {
      const qs = type ? `?type=${encodeURIComponent(type)}` : '';
      return request<ListPlansResponse>(`/api/subscriptions/plans${qs}`);
    },
    async createSubscriptionCheckout(
      input: CreateCheckoutInput,
    ): Promise<CreateCheckoutResponse> {
      return request<CreateCheckoutResponse>('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    // PayPal — separate processor (ADR-014 Option A). Same shape + same
    // `configured: false` degradation as Stripe checkout.
    async createPayPalCheckout(
      input: CreateCheckoutInput,
    ): Promise<CreateCheckoutResponse> {
      return request<CreateCheckoutResponse>('/api/subscriptions/paypal/checkout', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    // Secure Mailbox (consumer) — outside_user. PostGrid letter correspondence
    // with monthly allowance + purchased credits.
    async listMailboxThreads(): Promise<ListMailboxThreadsResponse> {
      return request<ListMailboxThreadsResponse>('/api/mailbox/threads');
    },
    async getMailboxThread(threadId: string): Promise<MailboxThreadDetail> {
      return request(`/api/mailbox/threads/${threadId}`);
    },
    async getLetterEntitlement(): Promise<LetterEntitlement> {
      return request('/api/mailbox/entitlement');
    },
    async composeLetter(
      profileId: string,
      input: ComposeLetterInput,
    ): Promise<ComposeLetterResponse> {
      return request(`/api/mailbox/threads/${profileId}/messages`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async markMailboxThreadRead(threadId: string): Promise<void> {
      return request(`/api/mailbox/threads/${threadId}/read`, { method: 'PUT' });
    },
    // Buy more letters. Same `configured: false` degradation as swipe packs.
    async purchaseLetters(input: PurchaseLettersInput): Promise<CreateCheckoutResponse> {
      return request<CreateCheckoutResponse>('/api/mailbox/purchase', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    // Resources directory — public consumer read (full-text search).
    async listResources(query?: ListResourcesQuery): Promise<ListResourcesResponse> {
      return request<ListResourcesResponse>(
        `/api/resources${buildQuery(query as Record<string, unknown>)}`,
      );
    },

    // Resources directory — admin CRUD.
    async listAdminResources(): Promise<ListAdminResourcesResponse> {
      return request('/admin/resources');
    },
    async createResource(input: CreateResourceInput): Promise<AdminResource> {
      return request('/admin/resources', { method: 'POST', body: JSON.stringify(input) });
    },
    async updateResource(id: string, input: UpdateResourceInput): Promise<AdminResource> {
      return request(`/admin/resources/${id}`, { method: 'PUT', body: JSON.stringify(input) });
    },
    async deleteResource(id: string): Promise<void> {
      return request(`/admin/resources/${id}`, { method: 'DELETE' });
    },
    async listResourceCategories(): Promise<AdminResourceCategory[]> {
      return request('/admin/resources/categories');
    },
    async createResourceCategory(
      input: CreateResourceCategoryInput,
    ): Promise<AdminResourceCategory> {
      return request('/admin/resources/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async updateResourceCategory(
      id: string,
      input: UpdateResourceCategoryInput,
    ): Promise<AdminResourceCategory> {
      return request(`/admin/resources/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
  };
}

export interface MailFromAddressInput {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface PlanSetting {
  id: string;
  name: string;
  type: string;
  priceCents: number;
  billingInterval: string;
  isActive: boolean;
  stripePriceId: string | null;
  features: Record<string, unknown>;
}

export interface UpdatePlanSettingInput {
  name?: string;
  swipeDailyCap?: number;
  letterAllowance?: number;
  photoLimit?: number;
  bioWordLimit?: number;
  mailbox?: boolean;
  prioritySupport?: boolean;
}

export type ApiClient = ReturnType<typeof createApiClient>;
