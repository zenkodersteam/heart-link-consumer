'use client';

import type { AuthUser } from '@heartlink/consumer-api';
import { PASSWORD_MIN_LENGTH, passwordProblem } from '@heartlink/domain';
import { ArrowLeft, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { InputOtp, InputOtpGroup, InputOtpSlot } from '@/components/ui/otp-input';
import { Spinner } from '@/components/ui/spinner';
import {
  clearPendingSignUp,
  isPendingSignUp,
  rememberPendingSignUp,
} from '@/lib/pending-signup';
import { AFTER_SIGN_IN, AFTER_SIGN_UP } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { useSession } from './session-provider';

type Step = 'email' | 'code' | 'new-password';

/**
 * Which door someone came through.
 *
 * `password` signs in with one. `code` is the fallback for accounts that have
 * none. `reset` is the same emailed code, but it ends on "choose a new
 * password" rather than dropping you into the app — a forgotten password needs
 * replacing, not working around.
 */
type Flow = 'password' | 'code' | 'reset';

/**
 * Sign in, or sign up — the same two steps either way.
 *
 * `intent` changes this screen's wording and nothing else. Holding the address
 * is the whole of what either one proves, so the server decides from its own
 * records whether a code opens an account, creates one, or confirms an address
 * that has never been confirmed. Someone who clicks the wrong link still ends
 * up in the right place.
 */
/**
 * What to show when a request fails.
 *
 * The API's own wording is used where it wrote one deliberately — it is careful
 * about not saying whether a code was wrong, expired or never existed. A 5xx
 * has no such wording, only the framework's "Internal server error", which
 * tells someone nothing and reads as though they did something wrong.
 */
function failureMessage(status: number, message: string | undefined, fallback: string): string {
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return message ?? fallback;
}

export function OtpForm({ intent }: { intent: 'sign_in' | 'sign_up' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  /**
   * Signing in with a code instead of a password.
   *
   * Members who predate passwords have none, and anyone can forget one, so the
   * code path stays reachable — it is also how someone gets back in and sets a
   * new password.
   */
  const [flow, setFlow] = useState<Flow>('password');
  const [newPassword, setNewPassword] = useState('');
  /** Held only between verifying a reset code and saving the new password. */
  const [accessToken, setAccessToken] = useState<string | null>(null);
  /** Held with the token, and announced only once the new password is saved. */
  const [resetUser, setResetUser] = useState<AuthUser | null>(null);
  const useCode = flow !== 'password';
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  /**
   * Whether the last attempt failed, for the red border and `aria-invalid`.
   *
   * The message itself is not kept: it is announced in a toast, so holding it
   * here as well would mean the same words in two places, and the older of the
   * two going stale the moment anything else happens.
   */
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordShown, setPasswordShown] = useState(false);

  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const redirectTo = params.get('redirect_url');

  /**
   * Start the account, then send the code that confirms the address.
   *
   * The account is created now rather than when the code is entered, so
   * abandoning this step no longer throws the password away.
   */
  /** Flag the field and say what went wrong, in one place so they cannot drift. */
  function fail(message: string) {
    setInvalid(true);
    toast.error(message);
  }

  async function register() {
    setBusy(true);
    setInvalid(false);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string; expiresInMinutes?: number };
      if (!response.ok) {
        const message = failureMessage(
          response.status,
          data.message,
          'We could not start your account. Please try again.',
        );
        fail(message);
        return;
      }
      setExpiresInMinutes(data.expiresInMinutes ?? 10);
      rememberPendingSignUp(email);
      setStep('code');
    } catch {
      fail('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(resend = false) {
    setBusy(true);
    setInvalid(false);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; expiresInMinutes?: number };
      if (!response.ok) {
        fail(failureMessage(response.status, data.message, 'We could not send a code. Please try again.'));
        return;
      }
      setExpiresInMinutes(data.expiresInMinutes ?? 10);
      if (intent === 'sign_up') rememberPendingSignUp(email);
      setStep('code');
      if (resend) toast.success('Sent again', { description: 'It can take a moment to arrive.' });
    } catch {
      fail('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPassword() {
    setBusy(true);
    setInvalid(false);
    try {
      const response = await fetch('/api/auth/password/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string; user?: AuthUser };
      if (!response.ok) {
        // The server cannot tell these apart on purpose, but this browser knows
        // it started a sign-up with this address and never finished it.
        if (isPendingSignUp(email)) {
          toast.error('Confirm your email address first', {
            description:
              'We emailed you a code and it has not been entered yet. Your password works once the address is confirmed.',
            action: { label: 'Send a new code', onClick: () => void sendCode() },
          });
          return;
        }
        const message = failureMessage(
          response.status,
          data.message,
          'That email or password is not right.',
        );
        toast.error(message, {
          description: 'Check the address and password, or sign in with a code instead.',
        });
        setInvalid(true);
        return;
      }
      clearPendingSignUp();
      setUser(data.user ?? null);
      router.push(redirectTo ?? AFTER_SIGN_IN);
      router.refresh();
    } catch {
      fail('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveNewPassword() {
    const problem = passwordProblem(newPassword);
    if (problem) {
      fail(problem);
      return;
    }
    setBusy(true);
    setInvalid(false);
    try {
      const response = await fetch('/api/auth/password/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        const message = failureMessage(
          response.status,
          data.message,
          'We could not save that password. Please try again.',
        );
        fail(message);
        return;
      }
      setUser(resetUser);
      toast.success('Password updated', {
        description: 'You are signed in with your new password.',
      });
      router.push(redirectTo ?? AFTER_SIGN_IN);
      router.refresh();
    } catch {
      fail('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setInvalid(false);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: value }),
      });
      const data = (await response.json()) as {
        message?: string;
        user?: AuthUser;
        created?: boolean;
        accessToken?: string;
      };
      if (!response.ok) {
        const message = failureMessage(
          response.status,
          data.message,
          'That code is not right, or it has expired.',
        );
        fail(message);
        // The code is spent either way; clearing it saves someone editing a
        // dead one digit at a time.
        setCode('');
        codeInput.current?.focus();
        return;
      }

      clearPendingSignUp();

      // A reset ends on "choose a new password", so the app is not told about
      // the session yet — the proxy sends a signed-in visitor away from this
      // page, and flipping the state here invites that mid-reset. The cookie is
      // already set by the route handler, which is what the save below needs;
      // `setUser` waits until the password has actually changed.
      if (flow === 'reset') {
        setAccessToken(data.accessToken ?? null);
        setResetUser(data.user ?? null);
        setStep('new-password');
        return;
      }

      setUser(data.user ?? null);

      // A brand-new account has a profile to fill in before anything else
      // expects one; an existing one goes where they were headed.
      const destination = data.created ? AFTER_SIGN_UP : (redirectTo ?? AFTER_SIGN_IN);
      router.push(destination);
      // The signed-in layout is a server component and would otherwise still
      // be rendering the anonymous version from cache.
      router.refresh();
    } catch {
      fail('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'new-password') {
    return (
      <div>
        <h1 className="font-[family-name:var(--font-bree)] text-2xl text-ink">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Your address is confirmed. Pick something you have not used elsewhere.
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNewPassword();
          }}
        >
          <label
            htmlFor="new-password"
            className="mb-2 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
          >
            New password
          </label>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
              invalid ? 'border-danger' : 'border-line focus-within:border-primary',
            )}
          >
            <Lock className="size-4 shrink-0 text-ink-faint" />
            <input
              id="new-password"
              type="password"
              required
              autoFocus
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setInvalid(false);
              }}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
            />
          </div>

          <Button type="submit" className="mt-5 w-full" disabled={busy || !newPassword}>
            {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
            Save password
          </Button>
        </form>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setCode('');
            setInvalid(false);
            // Going back abandons a reset; the form returns to ordinary sign-in
            // rather than silently staying in a flow they stepped out of.
            setFlow('password');
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Use a different address
        </button>

        <h1 className="mt-5 font-[family-name:var(--font-bree)] text-2xl text-ink">
          Check your email
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          We sent a {String(expiresInMinutes)}-minute code to{' '}
          <span className="font-semibold text-ink">{email}</span>.
          {flow === 'reset' ? ' Enter it and you can choose a new password.' : ''}
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim().length === 6) void verify(code);
          }}
        >
          <label htmlFor="code" className="sr-only">
            Your six-digit code
          </label>
          <InputOtp
            id="code"
            ref={codeInput}
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              // Submitted on the sixth digit: it saves a deliberate press for
              // the one thing everybody does next. The value is passed rather
              // than read back from state, which has not updated yet.
              if (value.length === 6) void verify(value);
            }}
            // Digits only, and the code offered by the OS from the email or SMS.
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoFocus
            disabled={busy}
            aria-invalid={invalid || undefined}
          >
            <InputOtpGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOtpSlot key={index} index={index} invalid={invalid} />
              ))}
            </InputOtpGroup>
          </InputOtp>

          <Button type="submit" className="mt-5 w-full" disabled={busy || code.length < 6}>
            {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
            Continue
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-soft">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={() => void sendCode(true)}
            disabled={busy}
            className="font-semibold text-primary hover:underline disabled:opacity-50"
          >
            Send another
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-bree)] text-2xl text-ink">
        {intent === 'sign_up' ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {useCode
          ? 'Enter your email and we will send you a code to sign in.'
          : intent === 'sign_up'
            ? 'Choose a password. We will email you a code to confirm the address.'
            : 'Enter your email and password.'}
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (useCode) {
            void sendCode();
            return;
          }
          const problem = passwordProblem(password);
          if (problem) {
            fail(problem);
            return;
          }
          // Sign-up saves the account and password now and confirms the
          // address with a code; sign-in checks the password straight away.
          if (intent === 'sign_up') void register();
          else void signInWithPassword();
        }}
      >
        <label
          htmlFor="email"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
        >
          Email address
        </label>
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
            invalid ? 'border-danger' : 'border-line focus-within:border-primary',
          )}
        >
          <Mail className="size-4 shrink-0 text-ink-faint" />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>

        {!useCode ? (
          <>
            <div className="mb-2 mt-4 flex items-baseline justify-between gap-3">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
              >
                Password
              </label>
              {intent === 'sign_in' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!email.trim()) {
                      fail('Enter your email address first.');
                      return;
                    }
                    setFlow('reset');
                    setInvalid(false);
                    void sendCode();
                  }}
                  className="text-[12.5px] font-semibold text-primary hover:underline"
                >
                  Forgot your password?
                </button>
              ) : null}
            </div>
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
                invalid ? 'border-danger' : 'border-line focus-within:border-primary',
              )}
            >
              <Lock className="size-4 shrink-0 text-ink-faint" />
              <input
                id="password"
                type={passwordShown ? 'text' : 'password'}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setInvalid(false);
                }}
                autoComplete={intent === 'sign_up' ? 'new-password' : 'current-password'}
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={
                  intent === 'sign_up' ? `At least ${PASSWORD_MIN_LENGTH} characters` : 'Your password'
                }
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
              {/* A typed password is easy to get wrong and impossible to check,
                  which matters most when setting one. The state is not
                  remembered between visits: leaving a password on screen is a
                  decision to take each time, not one to inherit. */}
              <button
                type="button"
                onClick={() => setPasswordShown((shown) => !shown)}
                aria-label={passwordShown ? 'Hide password' : 'Show password'}
                aria-pressed={passwordShown}
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
              >
                {passwordShown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </>
        ) : null}

        <Button
          type="submit"
          className="mt-5 w-full"
          disabled={busy || !email.trim() || (!useCode && !password)}
        >
          {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
          {useCode ? 'Send me a code' : intent === 'sign_up' ? 'Create account' : 'Sign in'}
        </Button>

        {/* Kept reachable on purpose: members who joined before passwords have
            none, and it is also how someone who has forgotten theirs gets back
            in to set a new one. */}
        <button
          type="button"
          onClick={() => {
            setFlow((f) => (f === 'password' ? 'code' : 'password'));
            setInvalid(false);
          }}
          className="mt-4 w-full text-center text-[13px] font-semibold text-primary hover:underline"
        >
          {useCode ? 'Use a password instead' : 'Sign in with a code instead'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {intent === 'sign_up' ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href="/sign-up" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-faint">
        By continuing you agree to our{' '}
        <Link href="/policy?doc=terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/policy?doc=privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
