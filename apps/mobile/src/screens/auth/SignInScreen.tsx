import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SignInResult } from '@heartlink/consumer-api';
import { emailProblem, passwordProblem } from '@heartlink/domain';

import { AuthShell } from '../../components/AuthShell';
import { OtpBoxes } from '../../components/OtpBoxes';
import { Button, Field } from '../../components/primitives';
import { goToApp } from '../../navigations/goToApp';
import {
  clearPendingSignUp,
  isPendingSignUp,
  rememberPendingSignUp,
} from '../../lib/pending-signup';
import { useToast } from '../../components/Toast';
import { useSession } from '../../lib/session';
import { useNavigation, useRoute } from '@react-navigation/native';

import type { RootNavigation, RootRoute } from '../../navigations/types';

import { colors, radii, spacing, themedStyles, type } from '../../theme';

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
  const navigation = useNavigation<RootNavigation>();
  const params = useRoute<RootRoute<'SignIn'>>().params ?? {};
  const signingUp = params.intent === 'sign_up';
  // So "next" moves to the field it names. Without these the return key only
  // put the keyboard away, on the one form where the fields below it are the
  // hardest to reach.
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
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

  /**
   * Which step is on screen.
   *
   * `forgot` is its own step rather than a flag on the sign-in form: tapping
   * "Forgot your password?" used to fire a code off the address already typed
   * and jump straight to the boxes, so someone who had typed nothing got only
   * an error, and someone who had mistyped got a code sent somewhere they
   * could not read. Asking for the address first is one screen, and it is the
   * screen people expect.
   */
  const [stage, setStage] = useState<'email' | 'forgot' | 'code' | 'new-password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /**
   * The second box, on the two screens that set a password rather than recall
   * one. A typo in a password being chosen is not a failed attempt — it is
   * being locked out of the account later, once the typo is the password.
   */
  const [confirmPassword, setConfirmPassword] = useState('');
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
  /**
   * What is wrong with a particular field, shown under that field.
   *
   * Kept apart from `invalid` because the two are different kinds of news. "Use
   * at least eight characters" is about the box it sits under and can be fixed
   * there; "that email or password is not right" is the server's verdict on the
   * whole attempt. A toast for the first kind pulled the eye away from the very
   * field that needed correcting, and was gone by the time it came back.
   */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  /** The server refused the attempt: colour the fields, announce the reason. */
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

  async function onRegister() {
    const address = email.trim();
    if (
      !validate([
        ['email', emailProblem(email)],
        ['password', passwordProblem(password)],
        ['confirmPassword', confirmPassword === password ? null : 'Both passwords must match.'],
      ])
    ) {
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
    if (!validate([['email', emailProblem(email)]])) return;
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
    if (
      !validate([
        ['email', emailProblem(email)],
        ['password', passwordProblem(password)],
      ])
    ) {
      return;
    }
    setSubmitting(true);
    setInvalid(false);
    try {
      await signInWithPassword(address, password);
      await goToApp();
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
    if (
      !validate([
        ['newPassword', passwordProblem(newPassword)],
        ['confirmPassword', confirmPassword === newPassword ? null : 'Both passwords must match.'],
      ])
    ) {
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
      await goToApp();
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
        navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        return;
      }
      await goToApp();
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
          error={fieldErrors.newPassword}
          value={newPassword}
          onChangeText={(t) => {
            setNewPassword(t);
            setInvalid(false);
            clearField('newPassword');
          }}
          secureTextEntry
          revealable
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          returnKeyType="next"
        />
        <Field
          label="Confirm new password"
          error={fieldErrors.confirmPassword}
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            clearField('confirmPassword');
          }}
          secureTextEntry
          revealable
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="Confirm password"
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

  if (stage === 'forgot') {
    return (
      <AuthShell
        title="Reset your password"
        subtitle="Tell us the address on your account and we will email you a code. You will choose a new password straight after."
      >
        <Field
          label="Email"
          error={fieldErrors.email}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setInvalid(false);
            clearField('email');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          autoFocus
          onSubmitEditing={() => void onSendCode()}
          returnKeyType="send"
        />

        {/* What happens next, before it happens. A reset is three screens and
            people abandon it halfway when they cannot see the shape of it. */}
        <View style={styles.stepsCard}>
          {[
            'We email you a six-digit code',
            'Enter the code to prove the address is yours',
            'Choose a new password',
          ].map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Button
          label="Email me a code"
          onPress={() => void onSendCode()}
          loading={submitting}
          disabled={!email.trim()}
        />
        <Button
          label="Back to sign in"
          variant="ghost"
          disabled={submitting}
          onPress={() => {
            setStage('email');
            setFlow('password');
            setInvalid(false);
          }}
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
            // Back to the step this came from: a reset returns to the reset
            // form rather than dumping someone on sign-in, where they would
            // have to find "Forgot your password?" all over again.
            setStage(flow === 'reset' ? 'forgot' : 'email');
            if (flow !== 'reset') setFlow('password');
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
        error={fieldErrors.email}
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          clearField('email');
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        onSubmitEditing={() => (useCode ? void onSendCode() : passwordRef.current?.focus())}
        returnKeyType={useCode ? 'go' : 'next'}
      />
      {!useCode ? (
        <Field
          ref={passwordRef}
          label="Password"
          error={fieldErrors.password}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setInvalid(false);
            clearField('password');
          }}
          secureTextEntry
          revealable
          autoCapitalize="none"
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          placeholder={signingUp ? 'At least 8 characters' : 'Your password'}
          onSubmitEditing={() =>
            signingUp ? confirmRef.current?.focus() : void onPasswordSignIn()
          }
          returnKeyType={signingUp ? 'next' : 'go'}
        />
      ) : null}

      {/* Only when the password is being chosen. Asking someone to type a
          password they already know twice is friction with nothing behind
          it. */}
      {!useCode && signingUp ? (
        <Field
          ref={confirmRef}
          label="Confirm password"
          error={fieldErrors.confirmPassword}
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            clearField('confirmPassword');
          }}
          secureTextEntry
          revealable
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="Confirm password"
          onSubmitEditing={() => void onRegister()}
          returnKeyType="go"
        />
      ) : null}

      {/* Only where it means something: there is nothing to forget while
          creating an account, and the code flow is already the way in. */}
      {!useCode && !signingUp ? (
        <Pressable
          onPress={() => {
            // Nothing is sent from here. The next screen asks for the address
            // and sends the code itself, so what is typed on this form is only
            // a starting point.
            setFlow('reset');
            setInvalid(false);
            setStage('forgot');
          }}
          // Hugging the words, not the row. A Pressable in this column is
          // full-width by default, and `textAlign: 'right'` only moves the
          // glyphs - so the empty half-inch left of "Forgot your password?",
          // directly above the Sign in button, was a live link to the reset
          // flow. The slop keeps it comfortable to hit without spanning the
          // row again.
          style={styles.forgotHit}
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          accessibilityRole="button"
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
            if (
              !validate([
                ['email', emailProblem(email)],
                ['password', passwordProblem(password)],
              ])
            ) {
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
        // Same reason as the reset link above: centred text in a full-width
        // Pressable makes the blank space either side of the words tappable,
        // and this one sits directly under the Sign in button.
        style={styles.altLinkHit}
        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
        accessibilityRole="button"
      >
        <Text style={styles.altLink}>
          {useCode ? 'Use a password instead' : 'Sign in with a code instead'}
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = themedStyles((colors) => ({
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  link: { ...type.button, color: colors.primary, fontSize: 14 },
  altLinkHit: { alignSelf: 'center' },
  altLink: { ...type.button, color: colors.primary, fontSize: 14, textAlign: 'center', marginTop: spacing.md },
  stepsCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    marginBottom: spacing.lg,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
  },
  stepNumText: { ...type.caption, fontSize: 11, color: colors.primary, fontFamily: 'Inter_700Bold' },
  // flexShrink so a long line wraps instead of running off the card.
  stepText: { ...type.caption, flexShrink: 1 },
  forgotHit: { alignSelf: 'flex-end' },
  forgot: { ...type.button, color: colors.primary, fontSize: 13, textAlign: 'right', marginTop: -spacing.xs },
  codeLabel: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
}));
