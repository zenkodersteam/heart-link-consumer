import { Feather } from '@expo/vector-icons';
import { ReactNode, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useScrollFieldIntoView } from './KeyboardSafeScrollView';

/**
 * Cross-platform elevation. `boxShadow` is a web-only CSS property, so shadows
 * declared with it alone render on web and vanish on device — which is why the
 * native build read flat next to the web build.
 */
function elevation(y: number, blur: number, opacity: number, color = colors.midnight) {
  return Platform.select({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(22, 5, 31, ${opacity})` } as object,
    default: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      shadowOffset: { width: 0, height: y },
      elevation: Math.round(y * 1.5),
    },
  });
}

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
  /**
   * Adds a show/hide control inside the field and starts it hidden.
   *
   * Passed rather than inferred from `secureTextEntry` so a field that should
   * stay hidden — a card number, say — does not silently gain a reveal.
   */
  revealable?: boolean;
}

export function Field({
  label,
  error,
  style,
  onFocus,
  onBlur,
  revealable,
  secureTextEntry,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  // Never remembered between visits: leaving a password on screen is a
  // decision to take each time, not one to inherit.
  const [revealed, setRevealed] = useState(false);
  const scrollIntoView = useScrollFieldIntoView();
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        <TextInput
          ref={inputRef}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={revealable ? secureTextEntry && !revealed : secureTextEntry}
          style={[
            fieldStyles.input,
            revealable ? fieldStyles.inputWithAction : null,
            webTransition,
            focused ? fieldStyles.inputFocused : null,
            error ? fieldStyles.inputError : null,
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            // Ask to be shown. The shell makes room for the keyboard, but on a
            // form taller than what is left — sign-in is one — the field being
            // typed into can still start below it.
            scrollIntoView(inputRef.current);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {revealable ? (
          <Pressable
            onPress={() => setRevealed((shown) => !shown)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: revealed }}
            // The tap target is bigger than the icon, which at 18px is well
            // under the 44pt everyone can reliably hit.
            hitSlop={12}
            style={fieldStyles.reveal}
          >
            <Feather
              name={revealed ? 'eye-off' : 'eye'}
              size={18}
              color={focused ? colors.primary : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
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
  inputRow: { position: 'relative', justifyContent: 'center' },
  // Room for the reveal, so a long password does not run underneath it.
  inputWithAction: { paddingRight: spacing.xxl + spacing.lg },
  reveal: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
      {loading ? <ActivityIndicator size="small" color={v.fg} style={btnStyles.spinner} /> : null}
      <Text style={[btnStyles.label, { color: v.fg }]} numberOfLines={1}>
        {label}
      </Text>
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
    minHeight: 48,
    flexDirection: 'row',
  },
  // Mockup CTA finish: pink gradient material + glow (web), solid pink native.
  primaryFinish: {
    ...Platform.select({
      web: { boxShadow: cta.glow, backgroundImage: cta.gradientCss } as object,
      default: {
        shadowColor: colors.primary,
        shadowOpacity: 0.34,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      },
    }),
  },
  pill: { borderRadius: radii.pill, paddingVertical: spacing.lg },
  iconLeft: { position: 'absolute', left: spacing.xl + spacing.sm },
  spinner: { marginRight: spacing.sm },
  // flexShrink matters because `base` is flexDirection:'row' (to seat the
  // spinner beside the label). Without it the text refuses to shrink and
  // overflows the button in narrow containers like the Liked grid.
  label: { ...type.button, flexShrink: 1, textAlign: 'center' },
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
    ...elevation(2, 12, 0.06),
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
