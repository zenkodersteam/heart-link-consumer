/**
 * Where an admin session lives.
 *
 * Two httpOnly cookies rather than the website's one. The admin app renders on
 * the server, so its pages need a usable access token during render — and a
 * server component cannot write a cookie, so it cannot refresh one itself. The
 * proxy does that instead, before the page runs, and writes both cookies onto
 * the response it is already returning.
 *
 * Both are httpOnly: nothing in the admin console has any business reading a
 * token from script.
 */
export const ACCESS_COOKIE = 'hl_admin_access';
export const REFRESH_COOKIE = 'hl_admin_session';

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SIXTY_DAYS_SECONDS,
  };
}

/** Given the token's own lifetime, so the cookie cannot outlive what it holds. */
export function accessCookieOptions(expiresInSeconds: number) {
  return { ...refreshCookieOptions(), maxAge: expiresInSeconds };
}

/**
 * When this access token expires, read from its own payload.
 *
 * Decoded, not verified: this only decides whether to refresh early, and the
 * API verifies the signature on every request it receives. Treating the claims
 * as trustworthy here would be a mistake; treating them as a hint is not.
 *
 * Returns 0 for anything unreadable, which makes the caller refresh.
 */
export function accessTokenExpiryMs(token: string): number {
  const body = token.split('.')[1];
  if (!body) return 0;
  try {
    const json = JSON.parse(
      Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function apiBaseUrl(): string {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/** Only these roles may hold an admin session at all. */
export const STAFF_ROLES = ['admin', 'ops_staff', 'moderator', 'billing'] as const;

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}
