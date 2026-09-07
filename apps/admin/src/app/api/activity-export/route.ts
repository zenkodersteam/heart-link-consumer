import { routeAccessToken } from '@/lib/route-token';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Hands the activity CSV to the browser.
 *
 * A plain link to the API would not carry the session — the token lives on the
 * server, and the API is on another origin — so the download is fetched here
 * and passed straight through. The filters ride along unchanged, so what
 * downloads is what was on screen rather than an unrelated dump.
 */
export async function GET(req: NextRequest) {
  const token = await routeAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Not signed in' }, { status: 401 });
  }

  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const search = req.nextUrl.searchParams.toString();

  const upstream = await fetch(`${baseUrl}/admin/activity/export${search ? `?${search}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { message: 'The export could not be produced. Try again in a moment.' },
      { status: upstream.status },
    );
  }

  const csv = await upstream.text();
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="heartlink-activity-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
