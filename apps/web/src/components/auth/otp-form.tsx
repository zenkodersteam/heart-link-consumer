'use client';

import type { AuthUser } from '@heartlink/consumer-api';
import { PASSWORD_MIN_LENGTH, passwordProblem } from '@heartlink/domain';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { InputOtp, InputOtpGroup, InputOtpSlot } from '@/components/ui/otp-input';
import { Spinner } from '@/components/ui/spinner';
import { AFTER_SIGN_IN, AFTER_SIGN_UP } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { useSession } from './session-provider';

type Step = 'email' | 'code';

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
  const [useCode, setUseCode] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);

  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const redirectTo = params.get('redirect_url');

  async function sendCode(resend = false) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; expiresInMinutes?: number };
      if (!response.ok) {
        setError(failureMessage(response.status, data.message, 'We could not send a code. Please try again.'));
        return;
      }
      setExpiresInMinutes(data.expiresInMinutes ?? 10);
      setStep('code');
      if (resend) setResentAt(Date.now());
    } catch {
      setError('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPassword() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/password/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string; user?: AuthUser };
      if (!response.ok) {
        setError(
          failureMessage(response.status, data.message, 'That email or password is not right.'),
        );
        return;
      }
      setUser(data.user ?? null);
      router.push(redirectTo ?? AFTER_SIGN_IN);
      router.refresh();
    } catch {
      setError('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError(null);
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
        setError(
          failureMessage(response.status, data.message, 'That code is not right, or it has expired.'),
        );
        // The code is spent either way; clearing it saves someone editing a
        // dead one digit at a time.
        setCode('');
        codeInput.current?.focus();
        return;
      }

      setUser(data.user ?? null);

      // Sign-up collects a password before the code, because the code is what
      // proves the address is real. Now that it has, save the password they
      // chose. A failure here is not worth blocking on: they are signed in, and
      // Account can set one later.
      if (password && data.accessToken) {
        await fetch('/api/auth/password/set', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.accessToken}`,
          },
          body: JSON.stringify({ password }),
        }).catch(() => undefined);
      }

      // A brand-new account has a profile to fill in before anything else
      // expects one; an existing one goes where they were headed.
      const destination = data.created ? AFTER_SIGN_UP : (redirectTo ?? AFTER_SIGN_IN);
      router.push(destination);
      // The signed-in layout is a server component and would otherwise still
      // be rendering the anonymous version from cache.
      router.refresh();
    } catch {
      setError('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'code') {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setCode('');
            setError(null);
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
            aria-invalid={error ? true : undefined}
          >
            <InputOtpGroup>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOtpSlot key={index} index={index} invalid={Boolean(error)} />
              ))}
            </InputOtpGroup>
          </InputOtp>

          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

          <Button type="submit" className="mt-5 w-full" disabled={busy || code.length < 6}>
            {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
            Continue
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-soft">
          {resentAt ? (
            'Sent again — it can take a moment to arrive.'
          ) : (
            <>
              Didn&apos;t get it?{' '}
              <button
                type="button"
                onClick={() => void sendCode(true)}
                disabled={busy}
                className="font-semibold text-primary hover:underline disabled:opacity-50"
              >
                Send another
              </button>
            </>
          )}
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
            setError(problem);
            return;
          }
          // Sign-up proves the address with a code first, then saves this
          // password; sign-in checks it straight away.
          if (intent === 'sign_up') void sendCode();
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
            error ? 'border-danger' : 'border-line focus-within:border-primary',
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
            <label
              htmlFor="password"
              className="mb-2 mt-4 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
            >
              Password
            </label>
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
                error ? 'border-danger' : 'border-line focus-within:border-primary',
              )}
            >
              <Lock className="size-4 shrink-0 text-ink-faint" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                autoComplete={intent === 'sign_up' ? 'new-password' : 'current-password'}
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={
                  intent === 'sign_up' ? `At least ${PASSWORD_MIN_LENGTH} characters` : 'Your password'
                }
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </>
        ) : null}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

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
            setUseCode((v) => !v);
            setError(null);
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
