import { apiBaseUrl, forward } from '../route-helpers';

/**
 * Start an account, then have the API email a code to confirm the address.
 *
 * Proxied like the other auth calls so the password never travels anywhere the
 * browser can be persuaded to send it, and so the caller's address reaches the
 * API's rate limiter as itself rather than as this server.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  return forward(response);
}

export const dynamic = 'force-dynamic';
