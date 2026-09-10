import { Feather } from '@expo/vector-icons';
import { ReactNode, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';

import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '../lib/haptics';
import { PRESS_SCALE, duration, easing, spring } from '../lib/motion';
import { colors, cta, radii, spacing, themedStyles, type } from '../theme';
import { useScrollFieldIntoView } from './KeyboardSafeScrollView';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A shadow that both platforms draw.
 *
 * iOS reads `shadow*`, Android reads `elevation`, and setting one without the
 * other is how a card ends up flat on half the devices it runs on.
 */
function elevation(y: number, blur: number, opacity: number, color = colors.midnight) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    shadowOffset: { width: 0, height: y },
    elevation: Math.round(y * 1.5),
  };
}

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

const fieldStyles = themedStyles((colors) => ({
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
}));

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  icon?: ReactNode;
  pill?: boolean;
}

/**
 * The app's button.
 *
 * The dip on press is a spring rather than a style swap: a button that jumps
 * to 0.98 and back reads as a redraw, and one that settles reads as a surface
 * being pushed. Every press also carries a haptic, chosen by variant - a
 * primary action is a commit, a secondary one is a selection - so the whole
 * app answers a finger the same way without each screen deciding.
 */
export function Button({ label, variant = 'primary', loading, disabled, icon, pill, style, onPress, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = btnVariant[variant];
  const isPrimary = variant === 'primary';
  const press = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - press.value * (1 - PRESS_SCALE) }],
    opacity: 1 - press.value * 0.06,
  }));

  return (
    <AnimatedPressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      onPressIn={() => {
        press.value = withTiming(1, { duration: duration.instant, easing: easing.out });
      }}
      onPressOut={() => {
        press.value = withSpring(0, spring.settle);
      }}
      onPress={(e) => {
        if (isPrimary) haptics.commit();
        else haptics.selection();
        onPress?.(e);
      }}
      style={[
        btnStyles.base,
        pill ? btnStyles.pill : null,
        { backgroundColor: v.bg, borderColor: v.border },
        isPrimary ? btnStyles.primaryFinish : null,
        isDisabled ? { opacity: 0.5 } : null,
        typeof style === 'function' ? undefined : style,
        animated,
      ]}
      {...rest}
    >
      {icon && !loading ? <View style={btnStyles.iconLeft}>{icon}</View> : null}
      {loading ? <ActivityIndicator size="small" color={v.fg} style={btnStyles.spinner} /> : null}
      {/* Capped, not free-scaling: this label sits in a fixed-height pill, and
          at 200% Dynamic Type an uncapped one clips instead of wrapping. */}
      <Text style={[btnStyles.label, { color: v.fg }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const btnVariant = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
  secondary: { bg: colors.bgElevated, fg: colors.textPrimary, border: colors.borderStrong },
  ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
} as const;

const btnStyles = themedStyles((colors) => ({
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
    shadowColor: colors.primary,
        shadowOpacity: 0.34,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
  },
  pill: { borderRadius: radii.pill, paddingVertical: spacing.lg },
  iconLeft: { position: 'absolute', left: spacing.xl + spacing.sm },
  spinner: { marginRight: spacing.sm },
  // flexShrink matters because `base` is flexDirection:'row' (to seat the
  // spinner beside the label). Without it the text refuses to shrink and
  // overflows the button in narrow containers like the Liked grid.
  label: { ...type.button, flexShrink: 1, textAlign: 'center' },
}));

export function Card({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  return (
    <View style={[cardStyles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const cardStyles = themedStyles((colors) => ({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...elevation(2, 12, 0.06),
  },
}));

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
