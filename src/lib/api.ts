/**
 * Inlined HeartLink API client + types.
 *
 * This file is vendored from the main monorepo's `@heartlink/api-contract` and
 * `@heartlink/api-client` packages. Only the public consumer surface is included
 * (browse profiles, profile detail). When the admin API contract changes,
 * re-sync this file by hand.
 *
 * Source of truth: heart-link/packages/api-contract/src/index.ts (M3 W8 section).
 */

import { reportReachable, reportUnreachable } from './connectivity';

// =============================================================================
// Public consumer profile browse types
// =============================================================================

export type PlanTier = 'basic' | 'diamond' | 'vip';

// Facility name + city are intentionally not exposed on the public surface
// (2026-06-16 client decision: do not reveal which facility a profile is at).
// Only the coarse state is surfaced. Mirrors the API contract.
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
  /** True only when staff recorded a completed identity check. */
  isVerified: boolean;
  id: string;
  displayName: string;
  age: number | null;
  bioExcerpt: string | null;
  facility: PublicProfileFacility;
  planTier: PlanTier | null;
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
  /** Whether this inmate accepts mail (real column; replaces the old constant). */
  acceptsMail: boolean;
  /** Interests from the intake OCR (multi-select, <=5). [] when none. */
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
// Outside-user self profile (Phase 4) - vendored from api-contract.
// Lifecycle: draft -> pending -> approved/rejected. Editing a rejected profile
// returns it to draft so it can be resubmitted.
// =============================================================================

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
  /** Durable one-way flag: true once onboarding was completed (first submit).
   *  Never resets on profile edits, so the onboarding gate keys on this. */
  onboardingComplete: boolean;
}

export interface UpdateOutsideProfileInput {
  displayName?: string;
  bio?: string;
  dateOfBirth?: string;
  location?: string;
  matchPreferences?: unknown;
}

// =============================================================================
// Subscriptions (M4) - vendored from api-contract subscription section.
// PayPal intentionally out of scope this pass (single-path Stripe checkout).
// =============================================================================

export interface PlanFeatures {
  /** Inmate listing plans (annual): what a sponsor is buying for a profile. */
  tier?: 'basic' | 'diamond' | 'vip';
  photoLimit?: number;
  bioWordLimit?: number;
  /** Outside-user plans (monthly): what a subscriber is buying for themselves. */
  swipeDailyCap?: number;
  letterAllowance?: number;
  mailbox?: boolean;
  prioritySupport?: boolean;
  browseProfiles?: boolean;
  saveFavorites?: boolean;
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

export interface ListPlansResponse {
  plans: Plan[];
}

export interface CreateCheckoutInput {
  planId: string;
  profileId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  /** Processor-hosted approval URL, or null when payments are not configured. */
  url: string | null;
  /** False when the processor is not yet wired - the UI should show "coming soon". */
  configured: boolean;
}

// =============================================================================
// Secure Mailbox - PostGrid letter correspondence (vendored from api-contract).
// Outbound = a typed letter we print + mail; inbound = the inmate's scanned
// reply. NOT real-time chat. Monthly allowance + purchased letter credits.
// =============================================================================

export type MailDirection = 'inbound' | 'outbound';

export interface MailboxMessage {
  id: string;
  threadId: string;
  direction: MailDirection;
  subject: string | null;
  body: string | null;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  deliveryStatus: string | null;
  /**
   * Short-lived signed link to the scanned original, on inbound letters only.
   * The API has always returned this; the vendored copy had drifted and omitted
   * it, which is why the app could not show the original.
   */
  scanUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ConsentStatus {
  termsVersion: string;
  privacyVersion: string;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  /** True only when the versions currently in force have been accepted. */
  upToDate: boolean;
}

export interface MySubscription {
  active: boolean;
  planName: string | null;
  priceCents: number | null;
  billingInterval: string | null;
  renewsOn: string | null;
}

export interface BlockedProfile {
  profileId: string;
  displayName: string;
  blockedAt: string;
}

export type ReportReason = 'inappropriate_content' | 'fake_identity' | 'policy_violation';

/** Words allowed in a letter to a given profile, set by that profile's tier. */
export interface LetterLengthLimit {
  /** null means the recipient's plan sets no limit. */
  wordLimit: number | null;
  tier: string | null;
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

export interface LetterEntitlement {
  allowed: boolean;
  includedRemaining: number | null; // null = unlimited
  creditBalance: number;
  totalRemaining: number | null; // null = unlimited
  capReached: boolean;
  includedPerPeriod: number;
}

export interface ComposeLetterInput {
  subject?: string;
  body: string;
}

export interface ComposeLetterResponse {
  sent: boolean;
  capReached: boolean;
  entitlement: LetterEntitlement;
  deliveryConfigured: boolean;
  message: MailboxMessage | null;
}

export interface PurchaseLettersInput {
  pack: 'small' | 'medium' | 'large';
  processor: 'stripe' | 'paypal';
  successUrl: string;
  cancelUrl: string;
}

// =============================================================================
// Resources directory (vendored). Public read with Postgres full-text search.
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
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ListResourcesResponse {
  categories: ResourceCategory[];
  items: ResourceItem[];
  total: number;
}

// =============================================================================
// Client
// =============================================================================

interface ApiError {
  message?: string;
  code?: string;
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  body: unknown;
  constructor(status: number, code: string, message: string, body: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

// Swipe deck recording (freemium persistence + daily cap). Mirrors the API
// /api/swipes surface. recordSwipe persists the action so the browse query
// excludes already-actioned profiles; second_look removes the row (re-surfaces).
export type SwipeAction = 'like' | 'pass' | 'second_look';

export interface SwipeEntitlement {
  allowed: boolean;
  freeRemaining: number | null;
  creditBalance: number;
  totalRemaining: number | null;
  capReached: boolean;
  freeDailyCap: number;
}

export interface RecordSwipeResponse {
  recorded: boolean;
  capReached: boolean;
  entitlement: SwipeEntitlement;
}

export interface AnalyticsEventInput {
  event: string;
  props?: Record<string, unknown>;
  anonId?: string;
  source?: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
  cache?: RequestCache;
}

export function createApiClient(options: ApiClientOptions) {
  // Normalize the base URL: strip a trailing slash, and guarantee a scheme.
  // A scheme-less value (e.g. "api.example.com") is otherwise treated as a
  // path relative to the current origin, so requests silently hit the web
  // host's SPA fallback (200 text/html) instead of the API. Default to https.
  let baseUrl = options.baseUrl.replace(/\/$/, '');
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
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

    const url = `${baseUrl}${path}`;
    const hasToken = !!options.token;
    // Logs surface in browser DevTools console; safe in production (no secrets logged).
    // eslint-disable-next-line no-console
    console.log('[api] →', init.method ?? 'GET', url, hasToken ? '(authed)' : '(no token)');

    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers,
        cache: init.cache ?? defaultCache,
      });
    } catch (e) {
      // Network-level failure: CORS preflight blocked, DNS, offline, etc. fetch() throws TypeError.
      const detail = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error('[api] network error', url, detail);
      // Nothing came back at all, so the app is cut off from the API. Screens
      // read this to show an offline state rather than a generic failure.
      reportUnreachable();
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        `Network error reaching ${url}: ${detail}. Likely CORS, DNS, or the API is unreachable.`,
        null,
      );
    }

    // A reply of any status means the API is reachable, a 500 included.
    reportReachable();

    // eslint-disable-next-line no-console
    console.log('[api] ←', res.status, url);

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
      // eslint-disable-next-line no-console
      console.error('[api] error body', res.status, body);
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
      pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return pairs.length ? `?${pairs.join('&')}` : '';
  }

  return {
    async listPublicProfiles(
      query: ListPublicProfilesQuery = {},
    ): Promise<ListPublicProfilesResponse> {
      return request<ListPublicProfilesResponse>(
        `/api/profiles${buildQuery(query as Record<string, unknown>)}`,
      );
    },

    async getPublicProfile(id: string): Promise<PublicProfileDetail> {
      return request<PublicProfileDetail>(`/api/profiles/${encodeURIComponent(id)}`);
    },

    // Favorites (outside_user) - saved profiles.
    async listSavedProfiles(): Promise<ListSavedProfilesResponse> {
      return request<ListSavedProfilesResponse>(`/api/profiles/saved`);
    },

    async saveProfile(id: string): Promise<void> {
      await request<void>(`/api/profiles/${encodeURIComponent(id)}/save`, { method: 'POST' });
    },

    async unsaveProfile(id: string): Promise<void> {
      await request<void>(`/api/profiles/${encodeURIComponent(id)}/save`, { method: 'DELETE' });
    },

    // Record a deck action (like/pass/second_look). Persisting drives both the
    // browse "already-seen" exclusion and the freemium daily cap. Returns
    // capReached=true (not an error) when the free allowance is exhausted.
    async recordSwipe(id: string, action: SwipeAction): Promise<RecordSwipeResponse> {
      return request<RecordSwipeResponse>(
        `/api/swipes/${encodeURIComponent(id)}`,
        { method: 'POST', body: JSON.stringify({ action }) },
      );
    },

    async trackAnalytics(events: AnalyticsEventInput[]): Promise<void> {
      await request(`/api/analytics/events`, {
        method: 'POST',
        body: JSON.stringify({ events }),
      });
    },

    // Outside-user self profile. GET creates an empty draft on first read.
    // Account: consent, plan, blocking, reporting, deletion.
    async getConsent(): Promise<ConsentStatus> {
      return request<ConsentStatus>(`/api/me/consent`);
    },
    async acceptPolicies(): Promise<ConsentStatus> {
      return request<ConsentStatus>(`/api/me/consent`, { method: 'POST' });
    },
    async getMySubscription(): Promise<MySubscription> {
      return request<MySubscription>(`/api/me/subscription`);
    },
    async listBlocks(): Promise<{ items: BlockedProfile[]; total: number }> {
      return request<{ items: BlockedProfile[]; total: number }>(`/api/me/blocks`);
    },
    async blockProfile(profileId: string, reason?: string): Promise<{ blocked: boolean }> {
      return request<{ blocked: boolean }>(`/api/me/blocks/${encodeURIComponent(profileId)}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    async unblockProfile(profileId: string): Promise<{ blocked: boolean }> {
      return request<{ blocked: boolean }>(`/api/me/blocks/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
      });
    },
    async reportProfile(
      profileId: string,
      input: { reason: ReportReason; details?: string },
    ): Promise<{ reported: boolean }> {
      return request<{ reported: boolean }>(`/api/me/reports/${encodeURIComponent(profileId)}`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    /** Irreversible: removes the sign-in and scrubs personal details. */
    async deleteAccount(): Promise<{ deleted: boolean }> {
      return request<{ deleted: boolean }>(`/api/me/account`, { method: 'DELETE' });
    },

    async getMyProfile(): Promise<OutsideUserProfile> {
      return request<OutsideUserProfile>(`/api/me/profile`);
    },

    async updateMyProfile(input: UpdateOutsideProfileInput): Promise<OutsideUserProfile> {
      return request<OutsideUserProfile>(`/api/me/profile`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    async submitMyProfile(): Promise<OutsideUserProfile> {
      return request<OutsideUserProfile>(`/api/me/profile/submit`, { method: 'POST' });
    },

    /** Upload/replace the member's own profile photo (multipart, field `file`). */
    async uploadMyProfilePhoto(file: Blob, filename = 'photo.jpg'): Promise<OutsideUserProfile> {
      const form = new FormData();
      form.append('file', file, filename);
      return request<OutsideUserProfile>(`/api/me/profile/photo`, {
        method: 'POST',
        body: form,
      });
    },

    // Subscriptions (M4). Checkout degrades gracefully: when Stripe is not
    // configured the response is { configured: false, url: null }.
    async listPlans(): Promise<ListPlansResponse> {
      return request<ListPlansResponse>(`/api/subscriptions/plans`);
    },

    async createSubscriptionCheckout(
      input: CreateCheckoutInput,
    ): Promise<CreateCheckoutResponse> {
      return request<CreateCheckoutResponse>(`/api/subscriptions/checkout`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    // PayPal - separate processor. Same shape + same `configured: false`
    // degradation as Stripe checkout.
    async createPayPalCheckout(
      input: CreateCheckoutInput,
    ): Promise<CreateCheckoutResponse> {
      return request<CreateCheckoutResponse>(`/api/subscriptions/paypal/checkout`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    // Secure Mailbox (PostGrid letters). Monthly allowance + purchased credits.
    async listMailboxThreads(): Promise<ListMailboxThreadsResponse> {
      return request<ListMailboxThreadsResponse>(`/api/mailbox/threads`);
    },
    async getMailboxThread(threadId: string): Promise<MailboxThreadDetail> {
      return request<MailboxThreadDetail>(`/api/mailbox/threads/${encodeURIComponent(threadId)}`);
    },
    async getLetterEntitlement(): Promise<LetterEntitlement> {
      return request<LetterEntitlement>(`/api/mailbox/entitlement`);
    },
    /** Word limit for letters to this profile, so the composer can count live. */
    async getLetterLimit(profileId: string): Promise<LetterLengthLimit> {
      return request<LetterLengthLimit>(
        `/api/mailbox/profiles/${encodeURIComponent(profileId)}/letter-limit`,
      );
    },
    async composeLetter(
      profileId: string,
      input: ComposeLetterInput,
    ): Promise<ComposeLetterResponse> {
      return request<ComposeLetterResponse>(
        `/api/mailbox/threads/${encodeURIComponent(profileId)}/messages`,
        { method: 'POST', body: JSON.stringify(input) },
      );
    },
    async markMailboxThreadRead(threadId: string): Promise<void> {
      await request<void>(`/api/mailbox/threads/${encodeURIComponent(threadId)}/read`, {
        method: 'PUT',
      });
    },
    async purchaseLetters(input: PurchaseLettersInput): Promise<CreateCheckoutResponse> {
      return request<CreateCheckoutResponse>(`/api/mailbox/purchase`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    // Resources directory (public read with full-text search).
    async listResources(query: ListResourcesQuery = {}): Promise<ListResourcesResponse> {
      return request<ListResourcesResponse>(
        `/api/resources${buildQuery(query as Record<string, unknown>)}`,
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
