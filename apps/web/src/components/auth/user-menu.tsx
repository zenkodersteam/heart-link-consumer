'use client';

import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { useMyProfile } from '@/lib/queries';
import { cn } from '@/lib/utils';

import { useSession } from './session-provider';

/**
 * The avatar in the corner, and what hangs off it.
 *
 * The initial comes from whichever name we actually have — the profile is
 * filled in during onboarding, so for a brand new account the email is all
 * there is.
 */
export function UserMenu({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { user, signOut } = useSession();
  const { data: profile } = useMyProfile();
  const [signingOut, setSigningOut] = useState(false);

  const name = profile?.displayName ?? user?.displayName ?? null;
  const email = user?.email ?? null;
  const initial = (name?.[0] ?? email?.[0] ?? '?').toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Your account"
          className={cn(
            'grid size-9 place-items-center rounded-full font-semibold transition-transform hover:scale-105',
            tone === 'dark'
              ? 'bg-white/10 text-sidebar-text ring-1 ring-white/20'
              : 'bg-sidebar text-sidebar-text',
          )}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top">
        {email ? (
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            {name ? <p className="truncate text-sm font-semibold text-ink">{name}</p> : null}
            <p className="truncate text-[12.5px] text-ink-soft">{email}</p>
          </div>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="size-4 text-ink-faint" />
            Your account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/privacy-safety">
            <Settings className="size-4 text-ink-faint" />
            Privacy &amp; safety
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          // Kept open while the request runs: closing first would flash the
          // signed-in shell for the moment before the redirect lands.
          onSelect={(event) => {
            event.preventDefault();
            setSigningOut(true);
            void signOut();
          }}
        >
          {signingOut ? <Spinner size="sm" /> : <LogOut className="size-4 text-ink-faint" />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
