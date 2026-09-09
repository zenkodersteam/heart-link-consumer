import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

export interface KeyboardState {
  /**
   * How much of the window the keyboard covers.
   *
   * Always 0 on Android: the window itself is resized there
   * (`softwareKeyboardLayoutMode: 'resize'`), so the layout has already shrunk
   * and subtracting the height again would take the same space twice.
   */
  overlap: number;
  /** Whether a keyboard is on screen at all, on any platform. */
  visible: boolean;
}

/**
 * What the keyboard is currently covering.
 *
 * Measured from the keyboard's own frame rather than its reported height:
 * `screenY` accounts for split and floating keyboards on iPad, where the height
 * alone says the screen is covered when most of it is not.
 *
 * `keyboardWillChangeFrame` on iOS, so the layout moves with the keyboard's own
 * animation instead of snapping into place after it has finished — and so a
 * keyboard that changes size (an autocomplete bar appearing, a language switch)
 * is followed rather than measured once.
 */
export function useKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({ overlap: 0, visible: false });

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const isIos = Platform.OS === 'ios';

    const showEvent = isIos ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = isIos ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (event) => {
      const windowHeight = Dimensions.get('window').height;
      const covered = Math.max(0, windowHeight - (event.endCoordinates?.screenY ?? windowHeight));
      setState({ overlap: isIos ? covered : 0, visible: covered > 0 });
    });

    const hide = Keyboard.addListener(hideEvent, () => {
      setState({ overlap: 0, visible: false });
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return state;
}
