import { Easing } from 'react-native-reanimated';

/**
 * One set of durations, curves and springs for the whole app.
 *
 * Ten hand-tuned timings read as noise; the same three read as craft. Pick the
 * one that matches what the movement *is* - a state flipping, something
 * arriving, something responding to a finger - rather than picking a number.
 */

export const duration = {
  /** A state flipping: pressed, selected, checked. Barely perceptible. */
  instant: 120,
  /** The default. Something appearing, moving or crossfading in place. */
  base: 220,
  /** Something entering or leaving the screen entirely. */
  enter: 320,
  /** Ambient, looping motion - shimmer, breathing rings. */
  ambient: 1400,
} as const;

export const easing = {
  /** Arriving: fast out of the gate, settling gently. The default. */
  out: Easing.bezier(0.22, 1, 0.36, 1),
  /** Leaving: gathers speed as it goes, because nothing waits for it. */
  in: Easing.bezier(0.55, 0, 1, 0.45),
  /** Moving between two on-screen positions. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** Ambient loops, where any acceleration reads as a stutter. */
  linear: Easing.linear,
} as const;

/**
 * Springs, for anything a finger is or was just touching.
 *
 * A spring is right where the movement should feel physical; a duration is
 * right where it should feel authored. Swiping a card is physical. A sheet
 * appearing is authored.
 */
export const spring = {
  /** Returning to rest: a card released below the threshold, a pressed icon. */
  settle: { damping: 18, stiffness: 220, mass: 0.9 },
  /** A little overshoot, for something that should feel eager. */
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  /** No overshoot at all, for anything carrying text. */
  firm: { damping: 26, stiffness: 260, mass: 1 },
} as const;

/** How far a control dips when pressed. Used everywhere, so it is one number. */
export const PRESS_SCALE = 0.97;
