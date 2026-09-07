import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '../../src/components/AuthShell';
import { Button, Field } from '../../src/components/primitives';
import { takePendingRoute } from '../../src/lib/pending-route';
import { useSession } from '../../src/lib/session';
import { colors, spacing, type } from '../../src/theme';

/**
 * Signing in, and signing up, in two steps.
 *
 * There is no password here at all, so there is no password to forget, no
 * reset flow, and no second factor bolted on — the code sent to the address is
 * the proof, and it is the same proof either way. The screen this replaced
 * carried four stages and a strategy enum for exactly those cases.
 *
 * Whether this opens an account or creates one is the server's decision, taken
 * from what is in the database. So there is one screen, and nobody can arrive
 * at the wrong door.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { requestCode, signIn } = useSession();

  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function messageFrom(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }

  async function onSendCode(resend = false) {
    const address = email.trim();
    if (!address) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      // The address is the only input: the server decides whether this code
      // opens an account, creates one, or confirms an address that has never
      // been confirmed.
      setExpiresInMinutes(await requestCode(address));
      setStage('code');
      if (resend) setNotice('Sent again — it can take a moment to arrive.');
    } catch (e) {
      setError(messageFrom(e, 'Could not send a code. Check your email address and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(value: string) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const { created } = await signIn(email.trim(), value);
      // A brand-new account has the questions to answer before anything else
      // expects a profile; an existing one resumes wherever it was headed.
      if (created) {
        router.replace('/(onboarding)/onboarding');
        return;
      }
      const pending = takePendingRoute();
      router.replace((pending ?? '/(tabs)') as never);
    } catch (e) {
      setError(messageFrom(e, 'That code is not right, or it has expired.'));
      // The code is spent either way; clearing it saves editing a dead one.
      // The field keeps focus, since nothing here blurs it.
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'code') {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a ${expiresInMinutes}-minute code to ${email.trim()}.`}
        footer={
          <View style={styles.footerRow}>
            <Text style={type.bodyMuted}>Didn&apos;t get it?</Text>
            <Pressable onPress={() => void onSendCode(true)} disabled={submitting}>
              <Text style={styles.link}>Send another</Text>
            </Pressable>
          </View>
        }
      >
        <Field
          label="Your code"
          value={code}
          onChangeText={(next: string) => {
            const digits = next.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            // Submitted on the sixth digit. The value is passed rather than
            // read back from state, which has not updated yet.
            if (digits.length === 6) void onVerify(digits);
          }}
          keyboardType="number-pad"
          // Fills straight from the notification banner on iOS and Android.
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          placeholder="••••••"
          maxLength={6}
          style={styles.codeInput}
          autoFocus
        />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Continue"
          onPress={() => void onVerify(code)}
          loading={submitting}
          disabled={code.length < 6}
        />
        <Button
          label="Use a different address"
          variant="ghost"
          disabled={submitting}
          onPress={() => {
            setStage('email');
            setCode('');
            setError(null);
            setNotice(null);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Enter your email and we will send you a code. No password to remember."
    >
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        onSubmitEditing={() => void onSendCode()}
        returnKeyType="go"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Send me a code" onPress={() => void onSendCode()} loading={submitting} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  link: { ...type.button, color: colors.primary, fontSize: 14 },
  error: { ...type.caption, color: colors.danger, marginBottom: spacing.sm },
  notice: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  codeInput: { textAlign: 'center', fontSize: 26, letterSpacing: 8 },
});
