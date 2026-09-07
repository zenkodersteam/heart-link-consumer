import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/shell/AuthShell';
import { REFRESH_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  // Presence only. The proxy and the API decide whether the session is any
  // good; this just avoids showing a sign-in prompt to someone already in.
  if ((await cookies()).has(REFRESH_COOKIE)) {
    redirect('/dashboard');
  }

  return (
    <AuthShell
      title="Admin console"
      lede="Access the HeartLink admin workspace."
    >
      <Link href="/sign-in" className="hl-auth__primary">
        Sign in
      </Link>
    </AuthShell>
  );
}
