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

// =============================================================================
// Public consumer profile browse types
// =============================================================================

export type PlanTier = 'basic' | 'diamond' | 'vip';

export interface PublicProfileFacility {
  id: string;
  name: string;
  state: string;
  city: string;
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
// Subscriptions (M4) — vendored from api-contract subscription section.
// PayPal intentionally out of scope this pass (single-path Stripe checkout).
// =============================================================================

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
  /** Stripe-hosted Checkout URL, or null when payments are not configured. */
  url: string | null;
  /** False when Stripe is not yet wired — the UI should show "coming soon". */
  configured: boolean;
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
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        `Network error reaching ${url}: ${detail}. Likely CORS, DNS, or the API is unreachable.`,
        null,
      );
    }

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
      const json = await res.json();
      // DEBUG: surface the exact response shape so we can see what the API
      // actually returns (array vs object, top-level keys, body preview).
      // eslint-disable-next-line no-console
      console.log(
        '[api] ←body',
        res.status,
        path,
        Array.isArray(json)
          ? `array(len=${json.length})`
          : `keys=[${Object.keys((json as Record<string, unknown>) ?? {}).join(', ')}]`,
        JSON.stringify(json)?.slice(0, 800),
      );
      return json as T;
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

    // Favorites (outside_user) — saved profiles.
    async listSavedProfiles(): Promise<ListSavedProfilesResponse> {
      return request<ListSavedProfilesResponse>(`/api/profiles/saved`);
    },

    async saveProfile(id: string): Promise<void> {
      await request<void>(`/api/profiles/${encodeURIComponent(id)}/save`, { method: 'POST' });
    },

    async unsaveProfile(id: string): Promise<void> {
      await request<void>(`/api/profiles/${encodeURIComponent(id)}/save`, { method: 'DELETE' });
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
