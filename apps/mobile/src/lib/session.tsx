import type { AuthUser, SignInResult } from '@heartlink/consumer-api';
import {
  endSession,
  refreshSession,
  requestSignInCode,
  setAccountPassword,
  registerAccount,
  signInWithPassword as passwordSignIn,
  verifySignInCode,
} from '@heartlink/consumer-api';
import * as SecureStore from 'expo-secure-store';
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/**
 * The refresh token, in the device keychain.
 *
 * SecureStore and not AsyncStorage: this is the one credential that can mint
 * new sessions for sixty days, so it belongs somewhere the OS protects rather
 * than in a plain file another process on a jailbroken device could read. The
 * access token is never persisted at all — it lives fifteen minutes, and
 * fetching a new one on launch costs a single request.
 */
const REFRESH_KEY = 'heartlink.refresh_token';

interface SessionValue {
  /** A usable access token, refreshing first if the one held has expired. */
  getToken: () => Promise<string | null>;
  user: AuthUser | null;
  isSignedIn: boolean;
  /** False until the stored token has been checked, so screens can hold. */
  isLoaded: boolean;
  requestCode: (email: string) => Promise<number>;
  register: (email: string, password: string) => Promise<number>;
  signIn: (email: string, code: string) => Promise<{ created: boolean }>;
  /** Verify a code without adopting the session — see the reset flow. */
  verifyCodeOnly: (email: string, code: string) => Promise<SignInResult>;
  adoptSession: (result: SignInResult) => Promise<void>;
  setPasswordWithToken: (accessToken: string, password: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Refresh this long before the token actually expires, to allow for a slow request. */
const REFRESH_MARGIN_MS = 60 * 1000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refs, not state: a token change must not re-render the whole app, and every
  // reader wants the current value rather than the one from its render.
  const accessToken = useRef<string | null>(null);
  const expiresAt = useRef(0);
  const refreshToken = useRef<string | null>(null);
  // One refresh at a time. Several screens can find the token stale in the same
  // tick, and each would otherwise rotate the token — and a rotated token
  // presented again is exactly what the API treats as a stolen one.
  const inFlight = useRef<Promise<string | null> | null>(null);

  const clear = useCallback(async () => {
    accessToken.current = null;
    expiresAt.current = 0;
    refreshToken.current = null;
    setUser(null);
    setIsSignedIn(false);
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  }, []);

  const store = useCallback(
    async (tokens: { accessToken: string; refreshToken: string; expiresIn: number }) => {
      accessToken.current = tokens.accessToken;
      expiresAt.current = Date.now() + tokens.expiresIn * 1000;
      refreshToken.current = tokens.refreshToken;
      setIsSignedIn(true);
      await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken).catch(() => undefined);
    },
    [],
  );

  const refresh = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) return inFlight.current;

    const request = (async () => {
      const current = refreshToken.current;
      if (!current) return null;
      try {
        const tokens = await refreshSession(API_BASE_URL, current);
        await store(tokens);
        return tokens.accessToken;
      } catch (err) {
        // A network failure is not a signed-out session, and throwing someone
        // out of the app because a train went into a tunnel would be wrong.
        // Only the API actually saying no clears the session.
        const status = (err as { status?: number } | null)?.status;
        if (status === 401) await clear();
        return null;
      } finally {
        inFlight.current = null;
      }
    })();

    inFlight.current = request;
    return request;
  }, [store, clear]);

  const getToken = useCallback(async () => {
    if (accessToken.current && Date.now() < expiresAt.current - REFRESH_MARGIN_MS) {
      return accessToken.current;
    }
    return refresh();
  }, [refresh]);

  // Restore on launch: read the keychain, then trade the stored token for a
  // live pair. Everything downstream waits on `isLoaded` so no screen decides
  // somebody is signed out while this is still running.
  useEffect(() => {
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(REFRESH_KEY);
        if (stored) {
          refreshToken.current = stored;
          const token = await refresh();
          if (token) setIsSignedIn(true);
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [refresh]);

  const requestCode = useCallback(async (email: string) => {
    const result = await requestSignInCode(API_BASE_URL, { email });
    return result.expiresInMinutes;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await registerAccount(API_BASE_URL, { email, password });
    return result.expiresInMinutes;
  }, []);

  const signIn = useCallback(
    async (email: string, code: string) => {
      const result = await verifySignInCode(API_BASE_URL, { email, code });
      await store(result);
      setUser(result.user);
      return { created: result.created };
    },
    [store],
  );

  /**
   * Verify a code and hand back the session WITHOUT adopting it.
   *
   * Resetting a password needs the token a code buys, but not yet the signed-in
   * state: the auth group redirects to the app the moment `isSignedIn` flips,
   * which would carry someone out of the reset before they had chosen the new
   * password. So the caller holds the result, sets the password with it, and
   * calls `adoptSession` once that has worked.
   */
  const verifyCodeOnly = useCallback(
    async (email: string, code: string) => verifySignInCode(API_BASE_URL, { email, code }),
    [],
  );

  /** Take up a session that was verified earlier and deliberately held back. */
  const adoptSession = useCallback(
    async (result: SignInResult) => {
      await store(result);
      setUser(result.user);
    },
    [store],
  );

  /** Set a password using a token that has not been adopted as the session yet. */
  const setPasswordWithToken = useCallback(
    async (accessToken: string, password: string) => {
      await setAccountPassword(API_BASE_URL, accessToken, { password });
    },
    [],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const result = await passwordSignIn(API_BASE_URL, { email, password });
      await store(result);
      setUser(result.user);
    },
    [store],
  );

  /**
   * Choose or change the password on the signed-in account.
   *
   * Takes the access token from the same place every other authed call does, so
   * it cannot be reached without a live session.
   */
  const setPassword = useCallback(
    async (password: string) => {
      const token = await getToken();
      if (!token) throw new Error('You need to be signed in to set a password.');
      await setAccountPassword(API_BASE_URL, token, { password });
    },
    [getToken],
  );

  const signOut = useCallback(async () => {
    const current = refreshToken.current;
    await clear();
    // After clearing, so the app is already signed out even if the call hangs.
    await endSession(API_BASE_URL, current);
  }, [clear]);

  const value = useMemo<SessionValue>(
    () => ({
      getToken,
      user,
      isSignedIn,
      isLoaded,
      requestCode,
      register,
      signIn,
      verifyCodeOnly,
      adoptSession,
      setPasswordWithToken,
      signInWithPassword,
      setPassword,
      signOut,
    }),
    [
      getToken,
      user,
      isSignedIn,
      isLoaded,
      requestCode,
      register,
      signIn,
      verifyCodeOnly,
      adoptSession,
      setPasswordWithToken,
      signInWithPassword,
      setPassword,
      signOut,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
