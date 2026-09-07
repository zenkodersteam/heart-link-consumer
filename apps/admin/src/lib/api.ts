import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { createApiClient, type ApiClient } from '@heartlink/api-client';

/**
 * Build an authenticated API client for use inside Server Components and
 * Server Actions. Reads the Clerk JWT from the request context.
 *
 * Throws if the user isn't signed in - all admin routes are already guarded
 * by `middleware.ts`, so this should never fire in practice on those pages.
 */
export async function serverApi(): Promise<ApiClient> {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    throw new Error('Unauthenticated: no Clerk session');
  }
  const baseUrl =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000';
  return createApiClient({ baseUrl, token });
}
