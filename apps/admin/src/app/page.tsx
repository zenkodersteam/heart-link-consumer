import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/shell/AuthShell';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const { userId } = await auth();

  if (userId) {
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
