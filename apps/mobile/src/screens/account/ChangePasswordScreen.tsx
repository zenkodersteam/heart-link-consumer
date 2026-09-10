import { passwordProblem } from '@heartlink/domain';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardSafeScrollView } from '../../components/KeyboardSafeScrollView';
import { Button, Field } from '../../components/primitives';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useToast } from '../../components/Toast';
import { humanError } from '../../lib/errors';
import { useSession } from '../../lib/session';
import type { RootNavigation } from '../../navigations/types';
import { spacing, type } from '../../theme';

type FieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

/**
 * Change the password from inside the account.
 *
 * The current password is asked for, and checked by the server. A live
 * session is not enough on its own: a phone left unlocked would otherwise be
 * all it takes to lock its owner out of their own account, and this is the one
 * screen that can do that. Anyone who genuinely cannot supply it has the
 * forgot-password flow on the sign-in screen.
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

  function clearField(key: FieldKey) {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSave() {
    // Checked here as well as on the server, so the three obvious mistakes are
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
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScreenHeader title="Change password" />
      <KeyboardSafeScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          You stay signed in on this phone. Anywhere else, use the new password.
        </Text>

        <View style={styles.form}>
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
            placeholder="The one you use now"
            returnKeyType="next"
          />

          <Field
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
            placeholder="At least 8 characters"
            returnKeyType="next"
          />

          <Field
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
            placeholder="Type it again"
            onSubmitEditing={() => void onSave()}
            returnKeyType="go"
          />

          <Button label="Save new password" onPress={() => void onSave()} loading={saving} />
        </View>
      </KeyboardSafeScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: { ...type.bodyMuted, marginBottom: spacing.lg },
  form: { gap: spacing.xs },
});
