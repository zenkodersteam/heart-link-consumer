import { createApiClient, type ApiClient } from '@heartlink/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function baseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
  }
  return API_BASE_URL;
}

/**
 * A client carrying a freshly-minted Clerk token.
 *
 * Clerk session tokens are short-lived (~60s), so the token is fetched per
 * call rather than captured once — a client held across renders starts sending
 * an expired token within the minute.
 */
export async function browserApi(getToken: () => Promise<string | null>): Promise<ApiClient> {
  const token = (await getToken()) ?? undefined;
  return createApiClient({ baseUrl: baseUrl(), token });
}

/** Server components and route handlers, where the token comes from `auth()`. */
export async function serverApi(token: string | null): Promise<ApiClient> {
  return createApiClient({ baseUrl: baseUrl(), token: token ?? undefined });
}
