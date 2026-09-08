import { forwardRef, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * A ScrollView that keeps the focused field above the keyboard.
 *
 * Every screen with a text field had the same fault: the keyboard slid up and
 * covered the thing being typed into, with no way to scroll to it. Sign-in was
 * the worst of them — the password field and the button both sat under the
 * keyboard, so the only way through was to dismiss it, and dismissing it is
 * what people do when they think the app is broken.
 *
 * The fix deliberately moves nothing. Rather than shrinking or sliding the
 * layout — which makes headers jump and cards resize as the keyboard animates —
 * this only grows the scrollable area underneath the content, so the page is
 * free to scroll further up while looking exactly as it did.
 *
 * iOS does that natively with `automaticallyAdjustKeyboardInsets`, matching the
 * system animation curve for free. Android has no equivalent, so the same
 * effect is built from the keyboard events: the height it reports becomes
 * bottom padding on the content.
 *
 * `keyboardShouldPersistTaps="handled"` is not incidental. Without it the first
 * tap on a button while the keyboard is open is swallowed to dismiss it, and a
 * "Sign in" that needs pressing twice reads as a button that does not work.
 */
export interface KeyboardSafeScrollViewProps extends ScrollViewProps {
  /**
   * Room left under the last field once the keyboard is up. Enough that the
   * field is not flush against the keyboard, which looks like a clipping bug.
   */
  extraBottomSpace?: number;
}

export const KeyboardSafeScrollView = forwardRef<ScrollView, KeyboardSafeScrollViewProps>(
  function KeyboardSafeScrollView(
    { children, contentContainerStyle, extraBottomSpace = 24, ...rest },
    ref,
  ) {
    const androidInset = useAndroidKeyboardInset();

    // iOS handles its own inset natively, so adding padding there too would
    // double the gap and leave a visible band under the last field.
    const pad: StyleProp<ViewStyle> =
      androidInset > 0 ? { paddingBottom: androidInset + extraBottomSpace } : null;

    return (
      <ScrollView
        ref={ref}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardShouldPersistTaps="handled"
        // Let a downward drag put the keyboard away, the way every native list
        // behaves. Android has no interactive variant.
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={[contentContainerStyle, pad]}
        {...rest}
      >
        {children}
      </ScrollView>
    );
  },
);

/**
 * Height of the Android keyboard, or 0 when it is down.
 *
 * `keyboardDidShow` rather than `keyboardWillShow`: Android does not emit the
 * "will" events reliably, and a listener that never fires is worse than one
 * that fires slightly late.
 */
function useAndroidKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      setInset(event.endCoordinates?.height ?? 0);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setInset(0));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return inset;
}
