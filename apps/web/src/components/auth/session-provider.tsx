'use client';

import type { AuthUser } from '@heartlink/consumer-api';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface SessionValue {
  /**
   * A usable access token, refreshing first if the one held has expired.
   * Returns null when there is no session, which callers treat as signed out.
   */
  getToken: () => Promise<string | null>;
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
  /** False until the first refresh settles, so screens can hold rather than flash. */
  ready: boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Refresh this long before the token actually expires, to allow for a slow request. */
const REFRESH_MARGIN_MS = 60 * 1000;

/**
 * Holds the access token in memory and keeps it fresh.
 *
 * In memory rather than in storage on purpose: the refresh token lives in an
 * httpOnly cookie the page cannot read, so the worst an injected script can
 * take is a token that dies in fifteen minutes. The cost is one refresh call
 * after a page load, which is why `ready` exists.
 */
export function SessionProvider({
  children,
  initialUser = null,
  hasSession = false,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
  hasSession?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [ready, setReady] = useState(!hasSession);

  // Refs, not state: changing the token must not re-render the whole app, and
  // every reader wants the current value rather than the one from its render.
  const token = useRef<string | null>(null);
  const expiresAt = useRef(0);
  // One refresh at a time. Several queries can find the token stale in the same
  // tick, and without this each would rotate the cookie — and a rotated token
  // presented again is exactly what the API treats as a stolen one.
  const inFlight = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) return inFlight.current;

    const request = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          cache: 'no-store',
        });
        if (!response.ok) {
          token.current = null;
          expiresAt.current = 0;
          return null;
        }
        const data = (await response.json()) as {
          accessToken: string;
          expiresIn: number;
          user?: AuthUser | null;
        };
        token.current = data.accessToken;
        expiresAt.current = Date.now() + data.expiresIn * 1000;
        // Who the session belongs to, not just proof that it exists. A reload
        // has only the cookie to go on, so without this the app came back
        // signed in with an empty user — which is why Account showed a dash
        // where the email belongs.
        if (data.user) setUser(data.user);
        return data.accessToken;
      } catch {
        // A network failure is not a signed-out session. The token is left as
        // it was so a brief blip does not throw someone out of the app.
        return token.current;
      } finally {
        inFlight.current = null;
      }
    })();

    inFlight.current = request;
    return request;
  }, []);

  const getToken = useCallback(async () => {
    if (token.current && Date.now() < expiresAt.current - REFRESH_MARGIN_MS) {
      return token.current;
    }
    return refresh();
  }, [refresh]);

  // One refresh on mount, only when a cookie was actually present. Without the
  // guard every anonymous visitor to the landing page makes a pointless call.
  useEffect(() => {
    if (!hasSession) return;
    void refresh().finally(() => setReady(true));
  }, [hasSession, refresh]);

  const signOut = useCallback(async () => {
    token.current = null;
    expiresAt.current = 0;
    setUser(null);
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => undefined);
    router.push('/');
    router.refresh();
  }, [router]);

  const value = useMemo<SessionValue>(
    () => ({ getToken, user, setUser, signOut, ready }),
    [getToken, user, signOut, ready],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
