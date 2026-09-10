import { apiBaseUrl, forward } from '../../route-helpers';

/**
 * Change the password on the signed-in account.
 *
 * A different endpoint from `password/set`, not the same one with an extra
 * field: this one makes the member prove the current password, which is the
 * only thing standing between a stolen session and being locked out of the
 * account. `password/set` cannot ask for it — it is the end of the
 * forgot-password path, where the whole problem is not knowing it.
 *
 * The access token is forwarded from the caller, as with every other authed
 * proxy here; the refresh token never leaves this side.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/password/change`, {
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
