import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '../../src/components/AuthShell';
import { Button, Field } from '../../src/components/primitives';
import { colors, spacing, type } from '../../src/theme';

type Stage = 'credentials' | 'verify';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clerkErrorMessage(e: unknown, fallback: string): string {
    if (typeof e === 'object' && e !== null && 'errors' in e) {
      // @ts-expect-error Clerk error shape
      return e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? fallback;
    }
    return fallback;
  }

  async function onSubmitCredentials() {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email, password });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
        return;
      }

      // Clerk requires another step. Common case: email-code verification.
      if (attempt.status === 'needs_first_factor') {
        const emailFactor = attempt.supportedFirstFactors?.find(
          (f) => f.strategy === 'email_code',
        );
        if (emailFactor && 'emailAddressId' in emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
          setStage('verify');
          return;
        }
        setError(
          `Sign-in needs a verification step the app can't handle yet (${attempt.supportedFirstFactors?.map((f) => f.strategy).join(', ') ?? 'unknown'}).`,
        );
        return;
      }

      if (attempt.status === 'needs_second_factor') {
        setError('Two-factor auth is required on this account. Not yet supported in the app.');
        return;
      }

      setError(`Sign-in incomplete (status: ${attempt.status}). Try again or contact support.`);
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
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/(tabs)');
        return;
      }

      setError(`Verification incomplete (status: ${attempt.status}).`);
    } catch (e) {
      setError(clerkErrorMessage(e, 'Invalid code. Check your email and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={stage === 'credentials' ? 'Welcome back' : 'Check your email'}
      subtitle={
        stage === 'credentials'
          ? 'Sign in to keep connecting.'
          : `We sent a 6-digit code to ${email}.`
      }
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Sign in" onPress={onSubmitCredentials} loading={submitting} />
        </>
      ) : (
        <>
          <Field
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="123456"
            maxLength={6}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Verify" onPress={onSubmitCode} loading={submitting} />
          <Button
            label="Back"
            variant="ghost"
            onPress={() => {
              setStage('credentials');
              setCode('');
              setError(null);
            }}
          />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  link: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  error: { ...type.caption, color: colors.danger, marginTop: spacing.xs },
});
