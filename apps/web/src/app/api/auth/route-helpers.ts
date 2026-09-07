import { NextResponse } from 'next/server';

import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/**
 * The API these routes stand in front of.
 *
 * Server-side only, so it is not the `NEXT_PUBLIC_` variable: the browser never
 * calls the auth endpoints directly, because doing so would put the refresh
 * token in reach of page scripts. Falls back to the public one so a deployment
 * that sets only that keeps working.
 */
export function apiBaseUrl(): string {
  const url = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error('API_BASE_URL is not configured');
  return url.replace(/\/$/, '');
}

export interface SessionTokensPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Hand the access token to the page and keep the refresh token here.
 *
 * The split is the whole design: the browser gets something it can use for
 * fifteen minutes and nothing that can outlive that.
 */
export function respondWithSession<T extends SessionTokensPayload>(
  payload: T,
  status = 200,
): NextResponse {
  const { refreshToken, ...rest } = payload;
  const response = NextResponse.json(rest, { status });
  response.cookies.set(SESSION_COOKIE, refreshToken, sessionCookieOptions());
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

/** Pass the API's own wording through; it is deliberate about what it discloses. */
export async function forward(response: Response): Promise<NextResponse> {
  const body: unknown = await response.json().catch(() => null);
  return NextResponse.json(body ?? { message: 'Something went wrong.' }, {
    status: response.status,
  });
}
