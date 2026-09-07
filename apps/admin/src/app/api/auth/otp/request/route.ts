import { NextResponse } from 'next/server';

import { apiBaseUrl } from '@/lib/session';

/**
 * Ask the API to email a staff sign-in code.
 *
 * The API answers the same way for every address, so this endpoint cannot be
 * used to find out who has an admin account. Whether the address is staff is
 * settled on verify, where the role actually comes back.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/otp/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    },
    body: JSON.stringify({ ...(body as object), intent: 'sign_in' }),
    cache: 'no-store',
  });

  const payload: unknown = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { message: 'Something went wrong.' }, {
    status: response.status,
  });
}

export const dynamic = 'force-dynamic';
