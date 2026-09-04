import { Feather } from '@expo/vector-icons';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '../../src/components/AuthShell';
import { Button, Field } from '../../src/components/primitives';
import { colors, fonts, spacing, type } from '../../src/theme';

type Stage = 'collect' | 'verify';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>('collect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Both stores require the member accepts the terms and privacy policy at
  // sign-up, and reviewers check the documents are reachable from here.
  const [accepted, setAccepted] = useState(false);

  function clerkErrorMessage(e: unknown, fallback: string): string {
    if (typeof e === 'object' && e !== null && 'errors' in e) {
      // @ts-expect-error Clerk error shape
      return e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? fallback;
    }
    return fallback;
  }

  async function onCreate() {
    if (!isLoaded) return;
    if (!accepted) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStage('verify');
    } catch (e) {
      setError(clerkErrorMessage(e, 'Could not start sign up. Try a stronger password or a different email.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify() {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        // New members introduce themselves before entering the app.
        router.replace('/onboarding');
      } else {
        setError('Verification incomplete. Try again.');
      }
    } catch (e) {
      setError(clerkErrorMessage(e, 'Invalid code. Check your email and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={stage === 'collect' ? 'Create your account' : 'Verify your email'}
      subtitle={
        stage === 'collect'
          ? 'Email and password. Nothing else for now.'
          : `We sent a 6-digit code to ${email}.`
      }
      footer={
        <View style={styles.footerRow}>
          <Text style={type.bodyMuted}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
          </Link>
        </View>
      }
    >
      {stage === 'collect' ? (
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
            placeholder="At least 8 characters"
            autoComplete="password-new"
          />
          <Pressable
            onPress={() => setAccepted((v) => !v)}
            style={styles.acceptRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
          >
            <View style={[styles.box, accepted ? styles.boxOn : null]}>
              {accepted ? <Feather name="check" size={12} color={colors.onPrimary} /> : null}
            </View>
            <Text style={styles.acceptText}>
              I agree to the{' '}
              <Text
                style={styles.acceptLink}
                onPress={() => router.push('/policy?doc=terms')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.acceptLink}
                onPress={() => router.push('/policy?doc=privacy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Continue" onPress={onCreate} loading={submitting} disabled={!accepted} />
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
          <Button label="Verify" onPress={onVerify} loading={submitting} />
          <Button
            label="Change email"
            variant="ghost"
            onPress={() => {
              setStage('collect');
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
  acceptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  acceptText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  acceptLink: { color: colors.primary, fontFamily: fonts.bodySemibold },
  footerRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  link: { color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  error: { ...type.caption, color: colors.danger, marginTop: spacing.xs },
});
