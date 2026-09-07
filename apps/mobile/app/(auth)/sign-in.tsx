import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '../../src/components/AuthShell';
import { Button, Field } from '../../src/components/primitives';
import { takePendingRoute } from '../../src/lib/pending-route';
import { colors, spacing, type } from '../../src/theme';

type Stage = 'credentials' | 'verify' | 'second_factor' | 'reset';
type SecondFactorStrategy = 'phone_code' | 'email_code' | 'totp' | 'backup_code';

// Derived from the hook so we don't take a direct dependency on @clerk/types,
// which is only present transitively.
type SignInAttempt = NonNullable<ReturnType<typeof useSignIn>['signIn']>;

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<SecondFactorStrategy | null>(null);
  const [backupCodeAvailable, setBackupCodeAvailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clerkErrorMessage(e: unknown, fallback: string): string {
    if (typeof e === 'object' && e !== null && 'errors' in e) {
      // @ts-expect-error Clerk error shape
      return e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? fallback;
    }
    return fallback;
  }

  async function completeSignIn(attempt: SignInAttempt): Promise<void> {
    if (!isLoaded) return;
    // `createdSessionId` is nullable. Passing null to setActive signs the user
    // out instead of in, so never forward it blindly.
    if (!attempt.createdSessionId) {
      setError('Signed in, but no session was created. Try again or contact support.');
      return;
    }
    await setActive({ session: attempt.createdSessionId });
    // Reading the remembered route hits disk on a phone, so it is awaited.
    router.replace(((await takePendingRoute()) as never) ?? '/(tabs)');
  }

  // Moves the user onto the 2FA step, preparing the factor when the strategy
  // requires Clerk to send a code first.
  async function startSecondFactor(attempt: SignInAttempt): Promise<void> {
    if (!isLoaded) return;

    const factors = attempt.supportedSecondFactors ?? signIn.supportedSecondFactors ?? [];
    const totp = factors.find((f) => f.strategy === 'totp');
    const phone = factors.find((f) => f.strategy === 'phone_code');
    const emailFactor = factors.find((f) => f.strategy === 'email_code');
    const backup = factors.find((f) => f.strategy === 'backup_code');

    // The first-factor code must not leak into the 2FA field.
    setCode('');
    setBackupCodeAvailable(Boolean(backup));
    setNotice(null);

    // Authenticator app first: no prepare step, so nothing can fail here.
    if (totp) {
      setSecondFactorStrategy('totp');
      setStage('second_factor');
      return;
    }

    if (phone && 'phoneNumberId' in phone) {
      await signIn.prepareSecondFactor({
        strategy: 'phone_code',
        phoneNumberId: phone.phoneNumberId,
      });
      setSecondFactorStrategy('phone_code');
      setStage('second_factor');
      return;
    }

    if (emailFactor && 'emailAddressId' in emailFactor) {
      await signIn.prepareSecondFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      setSecondFactorStrategy('email_code');
      setStage('second_factor');
      setNotice('We sent a 6-digit code to your email.');
      return;
    }

    if (backup) {
      setSecondFactorStrategy('backup_code');
      setStage('second_factor');
      return;
    }

    setError(
      `Two-factor is required but uses a method the app can't handle yet (${factors.map((f) => f.strategy).join(', ') || 'unknown'}).`,
    );
  }

  // Single place that decides what to do with a SignIn attempt, so every entry
  // point (password, email code, 2FA code) routes the same way.
  async function advance(attempt: SignInAttempt): Promise<void> {
    if (!isLoaded) return;

    if (attempt.status === 'complete') {
      await completeSignIn(attempt);
      return;
    }

    if (attempt.status === 'needs_second_factor') {
      await startSecondFactor(attempt);
      return;
    }

    if (attempt.status === 'needs_first_factor') {
      const emailFactor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
      if (emailFactor && 'emailAddressId' in emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        setCode('');
        setStage('verify');
        return;
      }
      setError(
        `Sign-in needs a verification step the app can't handle yet (${attempt.supportedFirstFactors?.map((f) => f.strategy).join(', ') ?? 'unknown'}).`,
      );
      return;
    }

    if (attempt.status === 'needs_new_password') {
      setError('Your password must be reset before you can sign in. Contact support to continue.');
      return;
    }

    setError(`Sign-in incomplete (status: ${attempt.status}). Try again or contact support.`);
  }

  async function onSubmitCredentials() {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      await advance(attempt);
    } catch (e) {
      setError(clerkErrorMessage(e, 'Could not sign in. Check your email and password.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode() {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      // A completed first factor can still return `needs_second_factor` when the
      // account has 2FA on. `advance` carries it to the 2FA step instead of
      // dead-ending the user on an "incomplete" error.
      const attempt = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
      await advance(attempt);
    } catch (e) {
      setError(clerkErrorMessage(e, 'Invalid code. Check your email and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitSecondFactor() {
    if (!isLoaded || !secondFactorStrategy) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      // Switch on the strategy rather than passing it through as a union, so
      // each call matches exactly one of Clerk's attempt param shapes.
      const attempt =
        secondFactorStrategy === 'totp'
          ? await signIn.attemptSecondFactor({ strategy: 'totp', code })
          : secondFactorStrategy === 'backup_code'
            ? await signIn.attemptSecondFactor({ strategy: 'backup_code', code })
            : secondFactorStrategy === 'email_code'
              ? await signIn.attemptSecondFactor({ strategy: 'email_code', code })
              : await signIn.attemptSecondFactor({ strategy: 'phone_code', code });

      await advance(attempt);
    } catch (e) {
      setError(clerkErrorMessage(e, 'Invalid code. Check the code and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  // Without this an undelivered SMS is a dead end: prepareSecondFactor only ran
  // once, on the way into this stage.
  async function onResendPhoneCode() {
    if (!isLoaded) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const phone = signIn.supportedSecondFactors?.find((f) => f.strategy === 'phone_code');
      if (!phone || !('phoneNumberId' in phone)) {
        setError('Could not resend the code. Go back and sign in again.');
        return;
      }
      await signIn.prepareSecondFactor({
        strategy: 'phone_code',
        phoneNumberId: phone.phoneNumberId,
      });
      setCode('');
      setNotice('We sent a new code.');
    } catch (e) {
      setError(clerkErrorMessage(e, 'Could not resend the code. Try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendEmailCode() {
    if (!isLoaded) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const emailFactor = signIn.supportedSecondFactors?.find((f) => f.strategy === 'email_code');
      if (!emailFactor || !('emailAddressId' in emailFactor)) {
        setError('Could not resend the code. Go back and sign in again.');
        return;
      }
      await signIn.prepareSecondFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      setCode('');
      setNotice('We sent a new code.');
    } catch (e) {
      setError(clerkErrorMessage(e, 'Could not resend the code. Try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  }

  // Clerk password reset: email a code, then set a new password with it.
  async function onForgotPassword() {
    if (!isLoaded) return;
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password?".');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      setCode('');
      setPassword('');
      setStage('reset');
      setNotice('We emailed you a 6-digit reset code.');
    } catch (e) {
      setError(clerkErrorMessage(e, 'Could not start a password reset. Check your email address.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitReset() {
    if (!isLoaded) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      await advance(attempt);
    } catch (e) {
      setError(clerkErrorMessage(e, 'Could not reset the password. Check the code and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  // Escape hatch for a lost authenticator/phone. Without it those users are
  // locked out of the app entirely.
  function onUseBackupCode() {
    setSecondFactorStrategy('backup_code');
    setCode('');
    setError(null);
    setNotice(null);
  }

  function onBack() {
    setStage('credentials');
    setCode('');
    setPassword('');
    setSecondFactorStrategy(null);
    setBackupCodeAvailable(false);
    setError(null);
    setNotice(null);
  }

  const isBackupCode = secondFactorStrategy === 'backup_code';

  const titleByStage: Record<Stage, string> = {
    credentials: 'Welcome back',
    verify: 'Check your email',
    second_factor: 'Two-factor verification',
    reset: 'Reset your password',
  };
  const subtitleByStage: Record<Stage, string> = {
    credentials: 'Sign in to continue your connections.',
    verify: `We sent a 6-digit code to ${email}.`,
    reset: `Enter the code we emailed to ${email} and choose a new password.`,
    second_factor: isBackupCode
      ? 'Enter one of the backup codes you saved when you set up two-factor.'
      : secondFactorStrategy === 'totp'
        ? 'Enter the code from your authenticator app.'
        : secondFactorStrategy === 'email_code'
          ? `Enter the 6-digit code we emailed to ${email}.`
          : 'Enter the 6-digit code we texted to your phone.',
  };

  return (
    <AuthShell
      title={titleByStage[stage]}
      subtitle={subtitleByStage[stage]}
      footer={
        <View style={styles.footerRow}>
          <Text style={type.bodyMuted}>New here?</Text>
          <Link href="/(auth)/sign-up" style={styles.link}>
            Create an account
          </Link>
        </View>
      }
    >
      {stage === 'credentials' ? (
        <>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            autoComplete="password"
          />
          <Pressable onPress={onForgotPassword} disabled={submitting} style={styles.forgotWrap}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Sign in" onPress={onSubmitCredentials} loading={submitting} />
        </>
      ) : stage === 'reset' ? (
        <>
          <Field
            label="Reset code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            keyboardType="number-pad"
            placeholder="123456"
            maxLength={6}
          />
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Reset password" onPress={onSubmitReset} loading={submitting} />
          <Button label="Back" variant="ghost" onPress={onBack} disabled={submitting} />
        </>
      ) : (
        <>
          {/* Backup codes are alphanumeric and longer than 6 chars, so the
              numeric keypad and 6-char cap must not apply to them. */}
          <Field
            label={isBackupCode ? 'Backup code' : 'Verification code'}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            keyboardType={isBackupCode ? 'default' : 'number-pad'}
            placeholder={isBackupCode ? 'abcd-efgh' : '123456'}
            maxLength={isBackupCode ? 12 : 6}
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Verify"
            onPress={stage === 'second_factor' ? onSubmitSecondFactor : onSubmitCode}
            loading={submitting}
          />
          {stage === 'second_factor' && secondFactorStrategy === 'phone_code' ? (
            <Button
              label="Resend code"
              variant="ghost"
              onPress={onResendPhoneCode}
              disabled={submitting}
            />
          ) : null}
          {stage === 'second_factor' && secondFactorStrategy === 'email_code' ? (
            <Button
              label="Resend code"
              variant="ghost"
              onPress={onResendEmailCode}
              disabled={submitting}
            />
          ) : null}
          {stage === 'second_factor' && backupCodeAvailable && !isBackupCode ? (
            <Button
              label="Use a backup code"
              variant="ghost"
              onPress={onUseBackupCode}
              disabled={submitting}
            />
          ) : null}
          <Button label="Back" variant="ghost" onPress={onBack} disabled={submitting} />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -spacing.xs },
  link: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  error: { ...type.caption, color: colors.danger, marginTop: spacing.xs },
  notice: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
});
