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
 * Exchange an email and password for an admin session.
 *
 * The same staff check as the code path: signing in never grants a staff role,
 * so a correct password for an ordinary member's address is refused here rather
 * than turned into an admin session. The account stays perfectly usable on the
 * member site.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl()}/auth/password/sign-in`, {
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
