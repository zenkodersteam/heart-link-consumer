import { apiBaseUrl, forward, respondWithSession } from '../../route-helpers';

/** Exchange a code for a session, keeping the refresh token on this side. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Passed through so the "new sign-in" email describes the visitor's
      // browser rather than this server.
      'user-agent': request.headers.get('user-agent') ?? '',
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  if (!response.ok) return forward(response);

  return respondWithSession(await response.json());
}

export const dynamic = 'force-dynamic';
