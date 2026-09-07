import { NextResponse } from 'next/server';

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  apiBaseUrl,
  isStaffRole,
  refreshCookieOptions,
} from '@/lib/session';

/**
 * Exchange a code for an admin session.
 *
 * There is no admin sign-up: signing in only ever grants `outside_user`, and
 * staff roles are given by a seed script or by an existing admin. So a correct
 * code for an ordinary member's address is refused here rather than being
 * turned into an admin session — and the account it just verified is left
 * perfectly usable on the member site.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-agent': request.headers.get('user-agent') ?? '',
      'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json(payload ?? { message: 'Something went wrong.' }, {
      status: response.status,
    });
  }

  const session = payload as {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { role: string; email: string; displayName: string | null };
  };

  if (!isStaffRole(session.user.role)) {
    return NextResponse.json(
      { message: 'This address does not have access to the admin console.' },
      { status: 403 },
    );
  }

  const result = NextResponse.json({ user: session.user });
  result.cookies.set(ACCESS_COOKIE, session.accessToken, accessCookieOptions(session.expiresIn));
  result.cookies.set(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
  return result;
}

export const dynamic = 'force-dynamic';
