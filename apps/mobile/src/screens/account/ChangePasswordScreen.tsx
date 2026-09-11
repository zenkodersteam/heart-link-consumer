import { Feather } from '@expo/vector-icons';
import { PASSWORD_MIN_LENGTH, passwordProblem } from '@heartlink/domain';
import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardSafeScrollView } from '../../components/KeyboardSafeScrollView';
import { Button, Field } from '../../components/primitives';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useToast } from '../../components/Toast';
import { humanError } from '../../lib/errors';
import { haptics } from '../../lib/haptics';
import { useSession } from '../../lib/session';
import type { RootNavigation } from '../../navigations/types';
import { colors, radii, spacing, themedStyles, type } from '../../theme';

type FieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

/** Same test the domain policy uses, so the checklist and the server agree. */
const SPECIAL_CHARACTER = /[^A-Za-z0-9]/;

/**
 * Change the password from inside the account.
 *
 * The current password is asked for, and checked by the server. A live
 * session is not enough on its own: a phone left unlocked would otherwise be
 * all it takes to lock its owner out of their own account, and this is the one
 * screen that can do that. Anyone who genuinely cannot supply it has the
 * forgot-password flow on the sign-in screen.
 *
 * Laid out as two cards — what proves it is you, and what replaces it — with
 * the rules for the new password ticking off live underneath it, so nobody has
 * to press Save to learn what was wrong.
 *
 * Every box reveals separately. Sharing one toggle across a password and its
 * confirmation shows the value being checked against, which is the opposite of
 * what typing it twice is for.
 */
export default function ChangePasswordScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { changePassword } = useSession();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const rules = [
    { key: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: newPassword.length >= PASSWORD_MIN_LENGTH },
    { key: 'special', label: 'One special character, like ! ? # or $', met: SPECIAL_CHARACTER.test(newPassword) },
    {
      key: 'different',
      label: 'Different from your current password',
      met: newPassword.length > 0 && newPassword !== currentPassword,
    },
  ];
  const matches = confirmPassword.length > 0 && confirmPassword === newPassword;
  const ready =
    currentPassword.length > 0 && rules.every((rule) => rule.met) && matches && !passwordProblem(newPassword);

  function clearField(key: FieldKey) {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSave() {
    // Checked here as well as on the server, so the obvious mistakes are
    // answered without a round trip. The server still decides: it is the only
    // side that knows the current password.
    const found: Partial<Record<FieldKey, string>> = {};
    if (!currentPassword) found.currentPassword = 'Enter your current password.';
    const problem = passwordProblem(newPassword);
    if (problem) found.newPassword = problem;
    else if (newPassword === currentPassword) {
      found.newPassword = 'Choose a password you are not already using.';
    }
    if (confirmPassword !== newPassword) found.confirmPassword = 'Both passwords must match.';

    if (Object.keys(found).length > 0) {
      haptics.warning();
      setErrors(found);
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.show('Password changed', 'Use your new password the next time you sign in.');
      navigation.goBack();
    } catch (e) {
      const message = humanError(e, 'We could not change your password. Please try again.');
      haptics.error();
      // The server's one useful distinction, put back on the field it belongs
      // to rather than left as a toast over the whole form.
      if (/current password/i.test(message)) setErrors({ currentPassword: message });
      else if (/already using/i.test(message)) setErrors({ newPassword: message });
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="Change password" />
      <KeyboardSafeScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="lock" size={24} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Keep your account yours</Text>
          <Text style={styles.heroBody}>
            You stay signed in on this phone. Everywhere else, use the new password.
          </Text>
        </View>

        <Text style={styles.groupLabel}>CURRENT</Text>
        <View style={styles.card}>
          <Field
            label="Current password"
            error={errors.currentPassword}
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              clearField('currentPassword');
            }}
            secureTextEntry
            revealable
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="The one you use now"
            returnKeyType="next"
            onSubmitEditing={() => newRef.current?.focus()}
          />
        </View>

        <Text style={styles.groupLabel}>NEW</Text>
        <View style={styles.card}>
          <Field
            ref={newRef}
            label="New password"
            error={errors.newPassword}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              clearField('newPassword');
            }}
            secureTextEntry
            revealable
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Choose a new password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <View style={styles.rules}>
            {rules.map((rule) => (
              <View key={rule.key} style={styles.rule}>
                <View style={[styles.ruleDot, rule.met ? styles.ruleDotMet : null]}>
                  {rule.met ? <Feather name="check" size={10} color={colors.onPrimary} /> : null}
                </View>
                <Text style={[styles.ruleText, rule.met ? styles.ruleTextMet : null]}>{rule.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Field
            ref={confirmRef}
            label="Confirm new password"
            error={errors.confirmPassword}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearField('confirmPassword');
            }}
            secureTextEntry
            revealable
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="Type it again"
            onSubmitEditing={() => void onSave()}
            returnKeyType="go"
          />
          {confirmPassword.length > 0 && !errors.confirmPassword ? (
            <View style={styles.rule}>
              <Feather
                name={matches ? 'check-circle' : 'x-circle'}
                size={14}
                color={matches ? colors.success : colors.textMuted}
              />
              <Text style={[styles.ruleText, matches ? styles.matchText : null]}>
                {matches ? 'Passwords match' : 'Passwords do not match yet'}
              </Text>
            </View>
          ) : null}
        </View>

        <Button
          label="Update password"
          pill
          onPress={() => void onSave()}
          loading={saving}
          disabled={!ready}
          style={styles.save}
        />

        <View style={styles.footnote}>
          <Feather name="shield" size={13} color={colors.textMuted} />
          <Text style={styles.footnoteText}>
            Forgot your current password? Sign out and choose “Forgot your password?” on the sign-in screen.
          </Text>
        </View>
      </KeyboardSafeScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
    marginBottom: spacing.xs,
  },
  heroTitle: { ...type.h2, fontSize: 21, color: colors.textPrimary, textAlign: 'center' },
  heroBody: { ...type.bodyMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },

  groupLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingBottom: 7,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  rules: { gap: 8, paddingHorizontal: 2 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleDotMet: { backgroundColor: colors.success, borderColor: colors.success },
  ruleText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted },
  ruleTextMet: { color: colors.textSecondary },
  matchText: { color: colors.success, fontFamily: 'Inter_600SemiBold' },

  save: { marginTop: spacing.xs },

  footnote: { flexDirection: 'row', gap: 8, marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  footnoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.textMuted },
}));
