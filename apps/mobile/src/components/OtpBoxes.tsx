import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radii, spacing } from '../theme';

const LENGTH = 6;

/**
 * Six boxes that are really one input.
 *
 * The obvious build is six TextInputs with focus juggled between them, and it
 * behaves badly in exactly the places that matter here: iOS fills a one-time
 * code into a single field, so autofill from the notification banner drops five
 * of the six digits; pasting does the same; and backspace at the start of a box
 * has to be simulated. So there is one real TextInput, laid over the row and
 * invisible, and the boxes are drawn from its value. Autofill, paste and the
 * keyboard are then the platform's own.
 *
 * Invisible via `opacity: 0` rather than `display: none` — a hidden input on
 * Android cannot take focus, which would leave the keyboard shut.
 */
export function OtpBoxes({
  value,
  onChange,
  invalid,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  // The caret, blinking on the box being filled. Native driver: it is opacity
  // only, so it can run off the JS thread and keep time while React works.
  const caret = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!focused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 0, duration: 500, delay: 500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(caret, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [focused, caret]);

  const digits = value.split('');
  // The box being filled, which is one past the last digit until the code is
  // complete — then the last box, so the row does not look like it has moved on.
  const activeIndex = Math.min(value.length, LENGTH - 1);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      accessibilityRole="none"
      style={styles.wrap}
    >
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length: LENGTH }, (_, index) => {
          const char = digits[index];
          const isActive = focused && !disabled && index === activeIndex && value.length < LENGTH;
          return (
            <View
              key={index}
              style={[
                styles.box,
                invalid ? styles.boxInvalid : null,
                isActive && !invalid ? styles.boxActive : null,
                disabled ? styles.boxDisabled : null,
              ]}
            >
              {char ? (
                <Text style={styles.char}>{char}</Text>
              ) : isActive ? (
                <Animated.View style={[styles.caret, { opacity: caret }]} />
              ) : null}
            </View>
          );
        })}
      </View>

      <TextInput
        ref={input}
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        maxLength={LENGTH}
        keyboardType="number-pad"
        // iOS offers the code from Mail or Messages above the keyboard;
        // Android fills it from the SMS. Both need a single field to fill.
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        accessibilityLabel="Your six-digit code"
        // Laid over the row and invisible, so a tap anywhere on the boxes lands
        // on the real input and the caret it draws is ours rather than the OS's.
        style={styles.input}
        caretHidden
        selectionColor="transparent"
      />
    </Pressable>
  );
}

const BOX_WIDTH = 46;
const BOX_HEIGHT = 56;

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'stretch', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  box: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  boxInvalid: { borderColor: colors.danger },
  boxDisabled: { opacity: 0.5 },
  char: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary },
  caret: { width: 1.5, height: 26, backgroundColor: colors.textPrimary },
  input: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    // Kept full-size rather than collapsed: a zero-size input is skipped by
    // Android's autofill, and the whole row should be tappable.
    color: 'transparent',
  },
});
