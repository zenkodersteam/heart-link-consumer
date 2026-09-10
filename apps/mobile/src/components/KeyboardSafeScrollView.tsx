import { createContext, forwardRef, useCallback, useContext, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
 * The work is in two halves, and both are needed:
 *
 * - Making room is the *shell's* job. The tab layout and AuthShell are each
 *   given the height the keyboard leaves behind, so this view already ends
 *   above it. iOS's `automaticallyAdjustKeyboardInsets` is deliberately not
 *   used: with the shell shrinking as well, the same compensation applied
 *   twice and a short form gained a keyboard's worth of empty scroll.
 * - Bringing the field *into* that room is this component's job, below.
 *
 * `keyboardShouldPersistTaps="handled"` is not incidental. Without it the first
 * tap on a button while the keyboard is open is swallowed to dismiss it, and a
 * "Sign in" that needs pressing twice reads as a button that does not work.
 */

/** Anything that can report where it is on screen: a TextInput, a View. */
export interface Measurable {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
}

/**
 * Scroll a field into view.
 *
 * Published through context rather than threaded down as a ref: fields sit
 * several components inside a form, and the only thing they need to say is
 * "make sure I am visible".
 */
type EnsureVisible = (target: Measurable | null) => void;

const NOOP: EnsureVisible = () => undefined;

const ScrollIntoViewContext = createContext<EnsureVisible>(NOOP);

/** For a field to call on focus. Does nothing outside one of these views. */
export function useScrollFieldIntoView(): EnsureVisible {
  return useContext(ScrollIntoViewContext);
}

export interface KeyboardSafeScrollViewProps extends ScrollViewProps {
  /**
   * Room left under the last field once the keyboard is up. Enough that the
   * field is not flush against the keyboard, which looks like a clipping bug.
   */
  extraBottomSpace?: number;
}

export const KeyboardSafeScrollView = forwardRef<ScrollView, KeyboardSafeScrollViewProps>(
  function KeyboardSafeScrollView(
    { children, contentContainerStyle, extraBottomSpace = 24, onScroll, ...rest },
    ref,
  ) {
    const scroller = useRef<ScrollView | null>(null);
    /** The scroll view's own frame, measured through a plain host View. */
    const host = useRef<View | null>(null);
    const offset = useRef(0);

    // A constant, not the keyboard's height: that space is already accounted
    // for by the shell on iOS, and by the OS on Android where the window is
    // resized (`softwareKeyboardLayoutMode: 'resize'`). Counting it twice gave
    // the content a whole keyboard of empty scroll to drag through.
    const pad: StyleProp<ViewStyle> = { paddingBottom: extraBottomSpace };

    const ensureVisible = useCallback<EnsureVisible>(
      (target) => {
        if (!target) return;
        // Next frame: focusing raises the keyboard, which resizes the shell.
        // Measuring before that lands compares against the old height and
        // decides, wrongly, that the field is already visible.
        requestAnimationFrame(() => {
          const wrapper = host.current;
          if (!wrapper) return;

          // Window coordinates on both sides, measured through plain hosts.
          // The alternative — React Native's own
          // `scrollResponderScrollNativeHandleToKeyboard` — does not exist
          // under the New Architecture, which this app runs, so calling it
          // failed silently and the field stayed behind the keyboard.
          wrapper.measureInWindow((_wx, wy, _ww, wh) => {
            target.measureInWindow((_tx, ty, _tw, th) => {
              const hidden = ty + th + extraBottomSpace - (wy + wh);
              if (hidden > 0) {
                scroller.current?.scrollTo({ y: offset.current + hidden, animated: true });
              }
            });
          });
        });
      },
      [extraBottomSpace],
    );

    return (
      <ScrollIntoViewContext.Provider value={ensureVisible}>
        <View ref={host} style={styles.fill} collapsable={false}>
          <ScrollView
            ref={(instance) => {
              scroller.current = instance;
              if (typeof ref === 'function') ref(instance);
              else if (ref) ref.current = instance;
            }}
            keyboardShouldPersistTaps="handled"
            // Let a downward drag put the keyboard away, the way every native
            // list behaves. Android has no interactive variant.
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            scrollEventThrottle={16}
            onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              offset.current = event.nativeEvent.contentOffset.y;
              onScroll?.(event);
            }}
            contentContainerStyle={[contentContainerStyle, pad]}
            {...rest}
          >
            {children}
          </ScrollView>
        </View>
      </ScrollIntoViewContext.Provider>
    );
  },
);

const styles = StyleSheet.create({
  // The scroll view filled its parent directly before this wrapper existed, so
  // it has to keep doing so; the wrapper is only here to be measured.
  fill: { flex: 1 },
});
