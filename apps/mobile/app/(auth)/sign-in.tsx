import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SignInResult } from '@heartlink/consumer-api';
import { passwordProblem } from '@heartlink/domain';

import { AuthShell } from '../../src/components/AuthShell';
import { OtpBoxes } from '../../src/components/OtpBoxes';
import { Button, Field } from '../../src/components/primitives';
import { takePendingRoute } from '../../src/lib/pending-route';
import {
  clearPendingSignUp,
  isPendingSignUp,
  rememberPendingSignUp,
} from '../../src/lib/pending-signup';
import { useToast } from '../../src/components/Toast';
import { useSession } from '../../src/lib/session';
import { colors, spacing, type } from '../../src/theme';

/**
 * Signing in, and signing up.
 *
 * One screen for both, because whether an address opens an account or creates
 * one is the server's decision, taken from what is in the database — nobody can
 * arrive at the wrong door. But `intent` decides the wording: someone who
 * pressed "Create Account" should not be greeted with "Welcome back", and
 * someone signing up is choosing a password rather than recalling one.
 */
export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string }>();
  const signingUp = params.intent === 'sign_up';
  const {
    requestCode,
    register,
    signIn,
    signInWithPassword,
    setPassword: savePassword,
    verifyCodeOnly,
    adoptSession,
    setPasswordWithToken,
  } = useSession();
  const toast = useToast();

  const [stage, setStage] = useState<'email' | 'code' | 'new-password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /**
   * Signing in with a code instead of a password.
   *
   * Members who joined before passwords have none, and anyone can forget one,
   * so the code path stays reachable — it is also how someone gets back in to
   * set a new password.
   */
  /**
   * Which door someone came through.
   *
   * `password` signs in with one. `code` is the fallback for accounts that have
   * none. `reset` is the same emailed code, but it ends on "choose a new
   * password" rather than dropping you into the app — a forgotten password
   * needs replacing, not working around.
   */
  const [flow, setFlow] = useState<'password' | 'code' | 'reset'>('password');
  const [newPassword, setNewPassword] = useState('');
  /**
   * A verified session held back on purpose during a reset.
   *
   * Adopting it here would flip `isSignedIn`, and the auth group redirects to
   * the app the moment that happens — carrying someone out of the reset before
   * they had chosen a new password. It is taken up once the password is saved.
   */
  const [heldSession, setHeldSession] = useState<SignInResult | null>(null);
  const useCode = flow !== 'password';
  const [code, setCode] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  /**
   * Whether the last attempt failed, for the red border on the field and the
   * code boxes.
   *
   * The message itself is not kept: it is announced in a toast, so holding it
   * here as well would mean the same words in two places, and the older of the
   * two going stale the moment anything else happens.
   */
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function messageFrom(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }

  /**
   * Start the account, then send the code that confirms the address.
   *
   * The account is created now rather than when the code is entered, so
   * abandoning this step no longer throws the chosen password away.
   */
  /** Flag the field and say what went wrong, in one place so they cannot drift. */
  function fail(message: string) {
    setInvalid(true);
    toast.error(message);
  }

  async function onRegister() {
    const address = email.trim();
    if (!address) {
      fail('Enter your email address.');
      return;
    }
    setSubmitting(true);
    setInvalid(false);
        try {
      setExpiresInMinutes(await register(address, password));
      rememberPendingSignUp(address);
      setStage('code');
    } catch (e) {
      fail(messageFrom(e, 'Could not start your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendCode(resend = false) {
    const address = email.trim();
    if (!address) {
      fail('Enter your email address.');
      return;
    }
    setSubmitting(true);
    setInvalid(false);
        try {
      // The address is the only input: the server decides whether this code
      // opens an account, creates one, or confirms an address that has never
      // been confirmed.
      setExpiresInMinutes(await requestCode(address));
      if (signingUp) rememberPendingSignUp(address);
      setStage('code');
      if (resend) toast.show('Sent again', 'It can take a moment to arrive.');
    } catch (e) {
      fail(messageFrom(e, 'Could not send a code. Check your email address and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function onPasswordSignIn() {
    const address = email.trim();
    if (!address) {
      fail('Enter your email address.');
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      fail(problem);
      return;
    }
    setSubmitting(true);
    setInvalid(false);
        try {
      await signInWithPassword(address, password);
      const pending = takePendingRoute();
      router.replace((pending ?? '/(tabs)') as never);
    } catch (e) {
      // The server cannot tell these apart on purpose, but this device knows it
      // started a sign-up with this address and never finished it.
      if (isPendingSignUp(address)) {
        toast.error(
          'Finish creating your account',
          'We emailed you a code but it has not been entered yet. Your account is not set up until it has.',
          { label: 'Send a new code', onPress: () => void onSendCode() },
        );
        setSubmitting(false);
        return;
      }
      toast.error(
        messageFrom(e, 'That email or password is not right'),
        'Check the address and password, or sign in with a code instead.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveNewPassword() {
    const problem = passwordProblem(newPassword);
    if (problem) {
      fail(problem);
      return;
    }
    setSubmitting(true);
    setInvalid(false);
    try {
      if (heldSession) {
        // Set the password first, then take up the session — the other order
        // signs you in and the auth group redirects away mid-reset.
        await setPasswordWithToken(heldSession.accessToken, newPassword);
        await adoptSession(heldSession);
      } else {
        await savePassword(newPassword);
      }
      toast.show('Password updated', 'You are signed in with your new password.');
      const pending = takePendingRoute();
      router.replace((pending ?? '/(tabs)') as never);
    } catch (e) {
      const message = messageFrom(e, 'We could not save that password. Please try again.');
      fail(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(value: string) {
    setSubmitting(true);
    setInvalid(false);
        try {
      if (flow === 'reset') {
        // Verified but deliberately not adopted — see `heldSession`.
        const held = await verifyCodeOnly(email.trim(), value);
        clearPendingSignUp();
        setHeldSession(held);
        setStage('new-password');
        setSubmitting(false);
        return;
      }

      const { created } = await signIn(email.trim(), value);
      clearPendingSignUp();

      // A brand-new account has the questions to answer before anything else
      // expects a profile; an existing one resumes wherever it was headed.
      if (created) {
        router.replace('/(onboarding)/onboarding');
        return;
      }
      const pending = takePendingRoute();
      router.replace((pending ?? '/(tabs)') as never);
    } catch (e) {
      fail(messageFrom(e, 'That code is not right, or it has expired.'));
      // The code is spent either way; clearing it saves editing a dead one.
      // The field keeps focus, since nothing here blurs it.
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'new-password') {
    return (
      <AuthShell
        title="Choose a new password"
        subtitle="Your address is confirmed. Pick something you have not used elsewhere."
      >
        <Field
          label="New password"
          value={newPassword}
          onChangeText={(t) => {
            setNewPassword(t);
            setInvalid(false);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          onSubmitEditing={() => void onSaveNewPassword()}
          returnKeyType="go"
        />
        <Button
          label="Save password"
          onPress={() => void onSaveNewPassword()}
          loading={submitting}
        />
      </AuthShell>
    );
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
        <Text style={styles.codeLabel}>Your code</Text>
        <OtpBoxes
          value={code}
          invalid={invalid}
          autoFocus
          onChange={(digits) => {
            setCode(digits);
            // Submitted on the sixth digit. The value is passed rather than
            // read back from state, which has not updated yet. The guard is
            // what the field's own `disabled` used to do — without taking the
            // keyboard away from someone fixing a typo.
            if (digits.length === 6 && !submitting) void onVerify(digits);
          }}
        />
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
            setFlow('password');
            setCode('');
            setInvalid(false);
                      }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={signingUp ? 'Create your account' : 'Welcome back'}
      subtitle={
        useCode
          ? 'Enter your email and we will send you a code to sign in.'
          : signingUp
            ? 'Choose a password. We will email you a code to confirm the address.'
            : 'Enter your email and password.'
      }
    >
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        onSubmitEditing={() => (useCode ? void onSendCode() : undefined)}
        returnKeyType={useCode ? 'go' : 'next'}
      />
      {!useCode ? (
        <Field
          label="Password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setInvalid(false);
          }}
          secureTextEntry
          revealable
          autoCapitalize="none"
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          placeholder={signingUp ? 'At least 8 characters' : 'Your password'}
          onSubmitEditing={() => void onPasswordSignIn()}
          returnKeyType="go"
        />
      ) : null}

      {/* Only where it means something: there is nothing to forget while
          creating an account, and the code flow is already the way in. */}
      {!useCode && !signingUp ? (
        <Pressable
          onPress={() => {
            const address = email.trim();
            if (!address) {
              fail('Enter your email address first.');
              return;
            }
            setFlow('reset');
            setInvalid(false);
            void onSendCode();
          }}
        >
          <Text style={styles.forgot}>Forgot your password?</Text>
        </Pressable>
      ) : null}
      <Button
        label={useCode ? 'Send me a code' : signingUp ? 'Create account' : 'Sign in'}
        onPress={() => {
          if (useCode) {
            void onSendCode();
            return;
          }
          // Sign-up saves the account and password now and confirms the
          // address with a code; sign-in checks the password straight away.
          if (signingUp) {
            const problem = passwordProblem(password);
            if (problem) {
              fail(problem);
              return;
            }
            void onRegister();
            return;
          }
          void onPasswordSignIn();
        }}
        loading={submitting}
      />
      {/* Kept reachable on purpose: members who joined before passwords have
          none, and it is how someone who has forgotten theirs gets back in. */}
      <Pressable
        onPress={() => {
          setFlow((f: 'password' | 'code' | 'reset') => (f === 'password' ? 'code' : 'password'));
          setInvalid(false);
        }}
      >
        <Text style={styles.altLink}>
          {useCode ? 'Use a password instead' : 'Sign in with a code instead'}
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  link: { ...type.button, color: colors.primary, fontSize: 14 },
  altLink: { ...type.button, color: colors.primary, fontSize: 14, textAlign: 'center', marginTop: spacing.md },
  forgot: { ...type.button, color: colors.primary, fontSize: 13, textAlign: 'right', marginTop: -spacing.xs },
  codeLabel: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
