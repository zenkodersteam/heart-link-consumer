'use client';

import type { AuthUser } from '@heartlink/consumer-api';
import { PASSWORD_MIN_LENGTH, emailProblem, passwordProblem } from '@heartlink/domain';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';

import { FieldError, RevealButton } from '@/components/auth/password-field';
import { Button } from '@/components/ui/button';
import { InputOtp, InputOtpGroup, InputOtpSlot, ONLY_DIGITS } from '@/components/ui/otp-input';
import { Spinner } from '@/components/ui/spinner';
import {
  clearPendingSignUp,
  isPendingSignUp,
  rememberPendingSignUp,
} from '@/lib/pending-signup';
import { AFTER_SIGN_IN, AFTER_SIGN_UP } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { useSession } from './session-provider';

/**
 * Which step is on screen.
 *
 * `forgot` is a step of its own rather than a flag on the sign-in form:
 * "Forgot your password?" used to send a code to whatever was already in the
 * email box and jump straight to the digits, so an empty box produced only an
 * error and a mistyped one sent the code somewhere unreadable. Asking for the
 * address on its own screen is what people expect, and it is where the reset
 * is explained.
 */
type Step = 'email' | 'forgot' | 'code' | 'new-password';

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
/** Greets by name when there is one, and does not invent one when there is not. */
function welcomeBack(displayName: string | null | undefined): string {
  const name = displayName?.trim();
  return name ? `Welcome back, ${name}.` : 'Welcome back.';
}

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
  /**
   * Typed a second time, and checked against the first.
   *
   * Only where a password is being *set*. A mistyped password at sign-in is a
   * failed attempt you retry; a mistyped one here is being locked out of the
   * account, and the reveal alone does not catch it because people do not
   * re-read what they think they just typed.
   */
  const [confirmPassword, setConfirmPassword] = useState('');
  // Its own toggle rather than sharing the one above: revealing the password
  // you are checking against defeats the point of typing it twice.
  const [confirmShown, setConfirmShown] = useState(false);
  /** Held only between verifying a reset code and saving the new password. */
  const [accessToken, setAccessToken] = useState<string | null>(null);
  /** Held with the token, and announced only once the new password is saved. */
  const [resetUser, setResetUser] = useState<AuthUser | null>(null);
  const useCode = flow !== 'password';
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  /**
   * Whether the server rejected the last attempt, for the red border.
   *
   * Its message is not kept here: the server's answer is about the attempt, not
   * about one field, so it is announced in a toast and this only colours the
   * inputs that attempt used.
   */
  const [invalid, setInvalid] = useState(false);
  /**
   * What is wrong with a particular field, shown under that field.
   *
   * Separate from `invalid` because the two are different kinds of news. "Use
   * at least eight characters" is about the box it sits under and can be fixed
   * there; "that email or password is not right" is about the attempt as a
   * whole. Putting the first in a toast made people look away from the field
   * they had to correct, and the message was gone by the time they looked back.
   */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  /** The server refused the attempt: colour the inputs, announce the reason. */
  function fail(message: string) {
    setInvalid(true);
    toast.error(message);
  }

  /** Drop a field's message as soon as it is being retyped. */
  function clearField(field: string) {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  /**
   * Check every field at once and report all of them.
   *
   * Stopping at the first problem makes someone fix one thing, submit, and be
   * told about the next - so the whole set is checked and shown together.
   */
  function validate(checks: Array<[field: string, problem: string | null]>): boolean {
    const found = checks.filter(([, problem]) => problem !== null);
    if (found.length === 0) return true;
    setFieldErrors((current) => {
      const next = { ...current };
      for (const [field, problem] of found) next[field] = problem as string;
      return next;
    });
    return false;
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
      // Announced before the navigation: the toaster is mounted in the root
      // layout, so the message survives the page change and lands on the
      // screen someone actually arrives at.
      toast.success('Signed in', { description: welcomeBack(data.user?.displayName) });
      router.push(redirectTo ?? AFTER_SIGN_IN);
    } catch {
      fail('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveNewPassword() {
    if (
      !validate([
        ['newPassword', passwordProblem(newPassword)],
        ['confirmPassword', confirmPassword === newPassword ? null : 'Both passwords must match.'],
      ])
    ) {
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
      // No refresh here either, for the reason spelled out on the code path.
      router.push(redirectTo ?? AFTER_SIGN_IN);
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

      // Read before the marker is cleared: this browser knows it started a
      // sign-up with this address even when the server does not call it new.
      const finishingSignUp = intent === 'sign_up' || isPendingSignUp(email);

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
      //
      // `data.created` alone is not enough. The account is made at the register
      // step now, so that abandoning the code screen no longer throws away the
      // password — which means by the time the code is checked the account
      // already exists and the server reports `created: false`. Sending those
      // people to the app was what made the dashboard flash past on the way to
      // onboarding, and the redirect they saw was the gate correcting it.
      const newAccount = data.created || finishingSignUp;
      toast.success(newAccount ? 'Account created' : 'Signed in', {
        description: newAccount
          ? 'A few questions next, so people know who they are writing to.'
          : welcomeBack(data.user?.displayName),
      });

      const destination = newAccount ? AFTER_SIGN_UP : (redirectTo ?? AFTER_SIGN_IN);
      // Just the navigation — deliberately no `router.refresh()` alongside it.
      //
      // Refresh re-fetches the route you are still on, which by this point is
      // /sign-in with a session cookie attached. The proxy bounces a signed-in
      // visitor off the auth pages, so that re-fetch came back a redirect, and
      // a redirect is the one thing the client router cannot resolve as a soft
      // navigation: it falls back to setting `window.location`. The document
      // reloaded, and everything held in memory went with it — including the
      // toast fired two lines above, which is why signing in never confirmed
      // anything.
      //
      // Nothing is lost by dropping it. The signed-in shell lives in a layout
      // this page is outside of, so arriving renders it for the first time
      // rather than from cache, and with the cookie already set.
      router.push(destination);
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
          noValidate
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
              invalid || fieldErrors.newPassword
                ? 'border-danger'
                : 'border-line focus-within:border-primary',
            )}
          >
            <Lock className="size-4 shrink-0 text-ink-faint" />
            <input
              id="new-password"
              type={passwordShown ? 'text' : 'password'}
              autoFocus
              value={newPassword}
              aria-invalid={fieldErrors.newPassword ? true : undefined}
              aria-describedby={fieldErrors.newPassword ? 'new-password-error' : undefined}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setInvalid(false);
                clearField('newPassword');
              }}
              autoComplete="new-password"
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
            />
            {/* The same reveal the sign-in field has. It matters most here:
                this is a password being *set*, so a typo is not a failed
                attempt, it is being locked out of the account later. */}
            <RevealButton shown={passwordShown} onToggle={() => setPasswordShown((v) => !v)} />
          </div>
          <FieldError id="new-password-error" message={fieldErrors.newPassword} />

          <label
            htmlFor="confirm-password"
            className="mb-2 mt-4 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
          >
            Confirm new password
          </label>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
              fieldErrors.confirmPassword
                ? 'border-danger'
                : 'border-line focus-within:border-primary',
            )}
          >
            <Lock className="size-4 shrink-0 text-ink-faint" />
            <input
              id="confirm-password"
              type={confirmShown ? 'text' : 'password'}
              value={confirmPassword}
              aria-invalid={fieldErrors.confirmPassword ? true : undefined}
              aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearField('confirmPassword');
              }}
              autoComplete="new-password"
              placeholder="Type it again"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
            />
            <RevealButton shown={confirmShown} onToggle={() => setConfirmShown((v) => !v)} />
          </div>
          <FieldError id="confirm-password-error" message={fieldErrors.confirmPassword} />

          <Button type="submit" className="mt-5 w-full" disabled={busy}>
            {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
            Save password
          </Button>
        </form>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setFlow('password');
            setInvalid(false);
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </button>

        <h1 className="mt-5 font-[family-name:var(--font-bree)] text-2xl text-ink">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Tell us the address on your account and we will email you a code. You will choose a
          new password straight after.
        </p>

        <form
          noValidate
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validate([['email', emailProblem(email)]])) return;
            void sendCode();
          }}
        >
          <label
            htmlFor="reset-email"
            className="mb-2 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
          >
            Email address
          </label>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
              invalid || fieldErrors.email
                ? 'border-danger'
                : 'border-line focus-within:border-primary',
            )}
          >
            <Mail className="size-4 shrink-0 text-ink-faint" />
            <input
              id="reset-email"
              type="email"
              autoFocus
              value={email}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'reset-email-error' : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setInvalid(false);
                clearField('email');
              }}
              autoComplete="email"
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
          <FieldError id="reset-email-error" message={fieldErrors.email} />

          {/* What happens next, before it happens. A reset is three screens,
              and people abandon it halfway when they cannot see its shape. */}
          <ol className="mt-5 space-y-3 rounded-2xl border border-line bg-surface-elevated p-4">
            {[
              'We email you a six-digit code',
              'Enter the code to prove the address is yours',
              'Choose a new password',
            ].map((stepText, index) => (
              <li key={stepText} className="flex items-center gap-3">
                <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-primary-faint text-[11px] font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-[13px] leading-snug text-ink-soft">{stepText}</span>
              </li>
            ))}
          </ol>

          <Button type="submit" className="mt-5 w-full" disabled={busy || !email.trim()}>
            {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
            Email me a code
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
            // Back to the step this came from: a reset returns to the reset
            // form rather than dropping someone on sign-in, where they would
            // have to find "Forgot your password?" again.
            setStep(flow === 'reset' ? 'forgot' : 'email');
            if (flow !== 'reset') setFlow('password');
            setCode('');
            setInvalid(false);
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
          noValidate
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
              // than read back from state, which has not updated yet. The guard
              // is what this field's `disabled` used to do — without taking the
              // input away from someone correcting a digit.
              if (value.length === 6 && !busy) void verify(value);
            }}
            /**
             * The clipboard rarely holds six bare digits. Mail clients copy
             * "123 456", or the sentence around it, or a trailing newline —
             * and the field caps at six characters, so what landed was a
             * different code, or nothing. Cleaning it here also makes the
             * component handle the paste itself: without a transformer it only
             * does so on iOS and leaves every other browser to the raw insert.
             */
            pasteTransformer={(pasted) => pasted.replace(/\D/g, '').slice(0, 6)}
            // Digits only, and the code offered by the OS from the email or SMS.
            inputMode="numeric"
            pattern={ONLY_DIGITS}
            autoComplete="one-time-code"
            autoFocus
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

      {/* `noValidate`: the browser's own bubble ("Please lengthen this text to
          8 characters or more") appears in the wrong place, in the wrong voice,
          and says nothing about the rules this form actually applies. Every
          field is checked below and explains itself inline. */}
      <form
        noValidate
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (useCode) {
            if (!validate([['email', emailProblem(email)]])) return;
            void sendCode();
            return;
          }
          if (
            !validate([
              ['email', emailProblem(email)],
              ['password', passwordProblem(password)],
              // Only when one is being set. At sign-in a second field would
              // ask people to type a password they already know, twice.
              ...(intent === 'sign_up'
                ? ([
                    [
                      'confirmPassword',
                      confirmPassword === password ? null : 'Both passwords must match.',
                    ],
                  ] as [string, string | null][])
                : []),
            ])
          ) {
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
            invalid || fieldErrors.email
              ? 'border-danger'
              : 'border-line focus-within:border-primary',
          )}
        >
          <Mail className="size-4 shrink-0 text-ink-faint" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearField('email');
            }}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            autoComplete="email"
            placeholder="you@example.com"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
        <FieldError id="email-error" message={fieldErrors.email} />

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
                    // Nothing is sent from here: the next screen asks for the
                    // address and sends the code itself, so what is in this
                    // form is only a starting point.
                    setFlow('reset');
                    setInvalid(false);
                    setStep('forgot');
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
                invalid || fieldErrors.password
                  ? 'border-danger'
                  : 'border-line focus-within:border-primary',
              )}
            >
              <Lock className="size-4 shrink-0 text-ink-faint" />
              <input
                id="password"
                type={passwordShown ? 'text' : 'password'}
                value={password}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setInvalid(false);
                  clearField('password');
                }}
                autoComplete={intent === 'sign_up' ? 'new-password' : 'current-password'}
                placeholder={
                  intent === 'sign_up' ? `At least ${PASSWORD_MIN_LENGTH} characters` : 'Your password'
                }
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
              />
              <RevealButton
                shown={passwordShown}
                onToggle={() => setPasswordShown((shown) => !shown)}
              />
            </div>
            <FieldError id="password-error" message={fieldErrors.password} />

            {intent === 'sign_up' ? (
              <>
                <label
                  htmlFor="confirm-signup-password"
                  className="mb-2 mt-4 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
                >
                  Confirm password
                </label>
                <div
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
                    fieldErrors.confirmPassword
                      ? 'border-danger'
                      : 'border-line focus-within:border-primary',
                  )}
                >
                  <Lock className="size-4 shrink-0 text-ink-faint" />
                  <input
                    id="confirm-signup-password"
                    type={confirmShown ? 'text' : 'password'}
                    value={confirmPassword}
                    aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                    aria-describedby={
                      fieldErrors.confirmPassword ? 'confirm-signup-password-error' : undefined
                    }
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearField('confirmPassword');
                    }}
                    autoComplete="new-password"
                    placeholder="Type it again"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
                  />
                  <RevealButton
                    shown={confirmShown}
                    onToggle={() => setConfirmShown((shown) => !shown)}
                  />
                </div>
                <FieldError
                  id="confirm-signup-password-error"
                  message={fieldErrors.confirmPassword}
                />
              </>
            ) : null}
          </>
        ) : null}

        <Button
          type="submit"
          className="mt-5 w-full"
          disabled={busy}
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

      {/* 13px on `ink-soft`, not 12px on `ink-faint`: this is the line that
          says what someone is agreeing to, and at 3.6:1 against the page it
          failed the contrast floor for body text. The links carry the brand
          colour as well as the underline, since an underline alone in the same
          colour as the sentence does not read as something to press. */}
      <p className="mt-6 text-center text-[13px] leading-relaxed text-ink-soft">
        By continuing you agree to our{' '}
        <Link href="/policy?doc=terms" className="font-semibold text-primary underline underline-offset-2">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/policy?doc=privacy" className="font-semibold text-primary underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * The sentence under a field saying why its value cannot be sent.
 *
 * `role="alert"` so it is announced when it appears, and its id is what the
 * input points `aria-describedby` at, so the reason is read out with the field
 * rather than floating loose on the page.
 */

