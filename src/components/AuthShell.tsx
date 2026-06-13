import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentClamp}>
            <View style={styles.brand}>
              <Text style={styles.brandMark}>HeartLink</Text>
              <View style={styles.brandUnderline} />
            </View>

            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            <View style={styles.body}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  contentClamp: { width: '100%', maxWidth: 440 },
  brand: { alignItems: 'flex-start', marginBottom: spacing.xxl },
  brandMark: { ...type.display, color: colors.primary, fontSize: 36 },
  brandUnderline: {
    height: 2,
    width: 48,
    marginTop: spacing.sm,
    backgroundColor: colors.gold,
    borderRadius: 999,
  },
  title: { ...type.h1, marginBottom: spacing.sm },
  subtitle: { ...type.bodyMuted, marginBottom: spacing.xl },
  body: { gap: spacing.md },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
});
