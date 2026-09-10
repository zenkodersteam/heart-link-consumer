import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, type View } from 'react-native';

/**
 * How much of one view the keyboard is covering, right now.
 *
 * Measured between two window coordinates: where this view actually ends, and
 * where the keyboard actually starts. That is deliberately not the same
 * question as "how tall is the keyboard" — an ancestor may already have made
 * room, in which case the answer here is zero and nothing gets counted twice.
 *
 * It is the honest version of the assumption the layouts used to make. They
 * took it on trust that the shell had shrunk: true inside the tab bar on iOS,
 * false for anything pushed onto the root stack, and false on Android now that
 * edge-to-edge means the window is no longer resized under the keyboard. When
 * the assumption was wrong there was nothing to notice it, and the field being
 * typed into simply sat behind the keyboard.
 *
 * `sync` is returned as well as the number, and the caller is expected to wire
 * it to the view's own `onLayout`. Measuring only on the keyboard's events is
 * measuring one instant too early: the shells that do make room are reacting to
 * the same event, so at the moment it fires this view is still its old size and
 * the answer is "the whole keyboard". Re-asking once the frame has actually
 * changed is what turns that back into zero, and what stops a shell that
 * shrinks and a scroll view that pads from both making room for the same
 * keyboard.
 *
 * Returns 0 whenever there is nothing to do, so `paddingBottom: overlap` is
 * safe to apply unconditionally.
 */
export function useKeyboardOverlap(ref: React.RefObject<View | null>): {
  overlap: number;
  sync: () => void;
} {
  const keyboardTop = useRef(Number.POSITIVE_INFINITY);
  const [overlap, setOverlap] = useState(0);

  const sync = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.measureInWindow((_x, y, _w, h) => {
      const covered = y + h - keyboardTop.current;
      setOverlap(Number.isFinite(covered) && covered > 0 ? Math.round(covered) : 0);
    });
  }, [ref]);

  useEffect(() => {
    const isIos = Platform.OS === 'ios';
    /** Anything scheduled, so nothing fires into a released view. */
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    // The keyboard's own animation is ~250ms, and shells resize along with it.
    // The frame this event lands on, the middle of that, and the end of it:
    // each only writes state when the answer has actually changed.
    const resettle = () => {
      sync();
      timers.push(setTimeout(sync, 140), setTimeout(sync, 320));
    };

    // `WillChangeFrame` on iOS so the room appears with the keyboard's own
    // animation rather than after it; Android only offers the `Did` events.
    const show = Keyboard.addListener(
      isIos ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      (event) => {
        keyboardTop.current = event.endCoordinates?.screenY ?? Dimensions.get('window').height;
        resettle();
      },
    );
    const hide = Keyboard.addListener(isIos ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = Number.POSITIVE_INFINITY;
      setOverlap(0);
    });
    return () => {
      show.remove();
      hide.remove();
      timers.forEach(clearTimeout);
    };
  }, [sync]);

  return { overlap, sync };
}
