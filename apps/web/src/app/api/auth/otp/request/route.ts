
import { apiBaseUrl, forward } from '../../route-helpers';

/**
 * Ask the API to email a code.
 *
 * Proxied rather than called from the page so that every auth call leaves the
 * browser by the same door as the one that must be proxied — the refresh —
 * and so the caller's IP reaches the API's rate limiter as one origin.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/otp/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Without this the API rate-limits every visitor as one caller, since
      // from its side every request arrives from this server.
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  return forward(response);
}

export const dynamic = 'force-dynamic';
