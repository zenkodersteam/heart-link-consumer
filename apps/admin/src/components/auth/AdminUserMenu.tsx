'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * The signed-in member of staff, and the way out.
 *
 * A plain button rather than a menu: there is exactly one action, and the role
 * is worth showing because what the console offers depends on it.
 */
export function AdminUserMenu({
  email,
  displayName,
  role,
}: {
  email: string;
  displayName: string | null;
  role: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => undefined);
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <div className="hl-userchip">
      <div className="hl-userchip__who">
        <span className="hl-userchip__name">{displayName ?? email}</span>
        <span className="hl-userchip__role">{role.replace(/_/g, ' ')}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        className="hl-userchip__out"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
