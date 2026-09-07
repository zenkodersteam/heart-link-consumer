import { apiBaseUrl, forward } from '../../route-helpers';

/**
 * Choose or change the account password.
 *
 * The access token is forwarded from the caller rather than read from the
 * cookie: this is only ever reached by a page that already has a live session,
 * and the refresh token deliberately never leaves this side.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/password/set`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: request.headers.get('authorization') ?? '',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  if (!response.ok) return forward(response);

  return Response.json(await response.json());
}

export const dynamic = 'force-dynamic';
