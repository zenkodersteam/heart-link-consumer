import { ReactNode, useState } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';

import { colors, cta, radii, spacing, type } from '../theme';

// RN Web honors CSS transitions via inline style; native ignores these keys,
// so guard so we don't trip RN's style validation on iOS/Android.
const webTransition: Record<string, unknown> | null =
  Platform.OS === 'web'
    ? {
        transitionProperty: 'opacity, transform, background-color, border-color',
        transitionDuration: '150ms',
      }
    : null;

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function Field({ label, error, style, onFocus, onBlur, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          fieldStyles.input,
          webTransition,
          focused ? fieldStyles.inputFocused : null,
          error ? fieldStyles.inputError : null,
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...type.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  errorText: { ...type.caption, color: colors.danger },
});

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  icon?: ReactNode;
  pill?: boolean;
}

export function Button({ label, variant = 'primary', loading, disabled, icon, pill, style, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = btnVariant[variant];
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        btnStyles.base,
        pill ? btnStyles.pill : null,
        { backgroundColor: v.bg, borderColor: v.border },
        isPrimary ? btnStyles.primaryFinish : null,
        webTransition,
        hovered && !isDisabled
          ? isPrimary
            ? { transform: [{ translateY: -2 }], boxShadow: cta.glowHover }
            : { opacity: 0.92, transform: [{ translateY: -1 }] }
          : null,
        pressed && !isDisabled ? { opacity: 0.92, transform: [{ scale: 0.98 }] } : null,
        isDisabled ? { opacity: 0.5 } : null,
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}
    >
      {icon && !loading ? <View style={btnStyles.iconLeft}>{icon}</View> : null}
      <Text style={[btnStyles.label, { color: v.fg }]}>{loading ? '...' : label}</Text>
    </Pressable>
  );
}

const btnVariant = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
  secondary: { bg: colors.bgElevated, fg: colors.textPrimary, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
} as const;

const btnStyles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  // Mockup CTA finish: pink gradient material + glow (web), solid pink native.
  primaryFinish: {
    boxShadow: cta.glow,
    ...Platform.select({
      web: { backgroundImage: cta.gradientCss } as object,
    }),
  },
  pill: { borderRadius: radii.pill, paddingVertical: spacing.lg },
  iconLeft: { position: 'absolute', left: spacing.xl + spacing.sm },
  label: { ...type.button },
});

export function Card({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View style={[cardStyles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'gold' | 'pink' }) {
  const t = pillTone[tone];
  return (
    <View style={[pillStyles.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[pillStyles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const pillTone = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary, border: colors.border },
  gold: { bg: colors.goldFaint, fg: colors.gold, border: colors.gold },
  pink: { bg: colors.primaryFaint, fg: colors.primary, border: colors.primary },
} as const;

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.4 },
});
