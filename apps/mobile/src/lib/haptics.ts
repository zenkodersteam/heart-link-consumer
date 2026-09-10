import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The app's haptic vocabulary.
 *
 * Deliberately a fixed set of named moments rather than a wrapper around
 * expo-haptics: a taptic engine used freely stops meaning anything, and the
 * point of a vocabulary is that the same feeling always means the same thing.
 * Call sites say what happened - `haptics.sent()` - not which waveform to play,
 * so the mapping can be tuned in one place.
 *
 * Every call is fire-and-forget and swallows its errors. A phone with the
 * engine disabled, an emulator without one, or web returns a rejected promise,
 * and none of that is a reason for a like to fail.
 */

/** Android's vibrator is coarse; a "selection" tick there is a buzz. */
const SUBTLE_ON_ANDROID = Platform.OS === 'android';

function fire(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  void run().catch(() => undefined);
}

export const haptics = {
  /** Moving between things: tab changed, filter pill, sort order, step. */
  selection() {
    fire(() =>
      SUBTLE_ON_ANDROID
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.selectionAsync(),
    );
  },

  /**
   * A card crossing the like/pass threshold under the thumb.
   *
   * The one haptic in the app that fires mid-gesture rather than on a commit,
   * and the one that makes a swipe feel like it has weight - the card is not
   * released yet, but the decision has been made.
   */
  threshold() {
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /** A deliberate, committed action: like, pass, dismiss a sheet. */
  commit() {
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  /** Something completed and is now true: letter sent, profile submitted. */
  success() {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },

  /** A limit, not a failure: the daily swipe cap, no letters left. */
  warning() {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },

  /** It did not work: a failed send, a rejected sign-in. */
  error() {
    fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
