import { createContext, forwardRef, useCallback, useContext, useEffect, useRef } from 'react';
import {
  Dimensions,
  Keyboard,
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

import { useKeyboardOverlap } from '../lib/use-keyboard-overlap';

/**
 * A ScrollView that keeps the focused field above the keyboard.
 *
 * Every screen with a text field had the same fault: the keyboard slid up and
 * covered the thing being typed into, with no way to scroll to it. Sign-in was
 * the worst of them — the password field and the button both sat under the
 * keyboard, so the only way through was to dismiss it, and dismissing it is
 * what people do when they think the app is broken.
 *
 * Everything here is decided from the keyboard's own frame, in window
 * coordinates, rather than from whether some ancestor has resized. Both used
 * to be true at once — the shell shrank and this scrolled — and the two had to
 * agree: on a screen with no shell (anything pushed onto the root stack), or
 * before the shell's resize had been laid out, the measurement said the field
 * was already visible and nothing moved. That is the bug people kept
 * reporting as "the password field hides behind the keyboard".
 *
 * So: this view measures where it actually ends, measures where the keyboard
 * actually starts, and works to whichever is higher. If a shell has already
 * made room, the overlap is zero and nothing is counted twice. If nothing has,
 * the padding below makes the room and the scroll uses it. iOS's
 * `automaticallyAdjustKeyboardInsets` stays off for the same reason it always
 * was — it is the third party to an agreement that only needs two.
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
    /**
     * Where the top of the keyboard is, in window coordinates.
     *
     * Kept here as well as inside the hook because `ensureVisible` runs from a
     * focus handler and needs the value as it is at that instant, not the one
     * captured when the callback was last built.
     */
    const keyboardTop = useRef(Number.POSITIVE_INFINITY);
    /**
     * How much of this view the keyboard covers that nothing else has taken.
     *
     * `sync` is wired to the host's own `onLayout` below: shells that make
     * room resize in answer to the same keyboard event this hook listens to,
     * so the first measurement is always of the old frame. Re-asking once the
     * frame has changed is what keeps a shrinking shell and this padding from
     * both making room for the same keyboard.
     */
    const { overlap: covered, sync: syncOverlap } = useKeyboardOverlap(host);

    useEffect(() => {
      const isIos = Platform.OS === 'ios';
      const show = Keyboard.addListener(
        isIos ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
        (event) => {
          keyboardTop.current = event.endCoordinates?.screenY ?? Dimensions.get('window').height;
        },
      );
      const hide = Keyboard.addListener(isIos ? 'keyboardWillHide' : 'keyboardDidHide', () => {
        keyboardTop.current = Number.POSITIVE_INFINITY;
      });
      return () => {
        show.remove();
        hide.remove();
      };
    }, []);

    // `covered` is 0 whenever an ancestor has already made the room — which is
    // the usual case inside the tab shell — so this never double-counts. It is
    // the whole keyboard on a screen that has no shell above it.
    const pad: StyleProp<ViewStyle> = { paddingBottom: extraBottomSpace + covered };

    // Nothing may fire after unmount: a stray scroll on a released view is a
    // crash on the old architecture and a warning on this one.
    const pending = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    useEffect(
      () => () => {
        pending.current.forEach(clearTimeout);
      },
      [],
    );

    const ensureVisible = useCallback<EnsureVisible>(
      (target) => {
        if (!target) return;

        const attempt = () => {
          const wrapper = host.current;
          if (!wrapper) return;

          // Window coordinates on both sides, measured through plain hosts.
          // The alternative — React Native's own
          // `scrollResponderScrollNativeHandleToKeyboard` — does not exist
          // under the New Architecture, which this app runs, so calling it
          // failed silently and the field stayed behind the keyboard.
          wrapper.measureInWindow((_wx, wy, _ww, wh) => {
            target.measureInWindow((_tx, ty, _tw, th) => {
              // Whichever comes first: the bottom of this view, or the top of
              // the keyboard. Trusting only the first is what left the field
              // hidden on screens where nothing shrinks.
              const limit = Math.min(wy + wh, keyboardTop.current);
              const hidden = ty + th + extraBottomSpace - limit;
              if (hidden > 0) {
                scroller.current?.scrollTo({ y: offset.current + hidden, animated: true });
              }
            });
          });
        };

        // Focusing and the keyboard arriving are separate events, and which
        // lands first is not ours to decide. Measuring once was a coin toss:
        // too early and the keyboard has no frame yet, so nothing looks
        // hidden. These three cover the frame the focus lands on, the middle
        // of the keyboard animation, and the end of it — and each only
        // scrolls if the field is still covered, so the extra passes cost
        // nothing once it is not.
        requestAnimationFrame(attempt);
        const soon = setTimeout(attempt, 160);
        const settled = setTimeout(attempt, 380);
        pending.current.push(soon, settled);
      },
      [extraBottomSpace],
    );


    return (
      <ScrollIntoViewContext.Provider value={ensureVisible}>
        <View ref={host} onLayout={syncOverlap} style={styles.fill} collapsable={false}>
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
