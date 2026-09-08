import { Feather } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, spacing, type } from '../theme';

/** Optional call-to-action rendered inside the toast. */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

/**
 * What kind of thing happened.
 *
 * Colour alone would not carry it — a green tick and a pink cross look the same
 * to someone who cannot tell them apart, and identical at a glance to anyone
 * moving quickly. Each tone brings its own glyph as well as its own colour.
 */
export type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  title: string;
  subtitle?: string;
  action?: ToastAction;
  tone: ToastTone;
}

interface ToastApi {
  /** Defaults to `success`, which is what most call sites are announcing. */
  show: (title: string, subtitle?: string, action?: ToastAction, tone?: ToastTone) => void;
  /** Shorthand for the failure case, so call sites read as what they mean. */
  error: (title: string, subtitle?: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined, error: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const VISIBLE_MS = 2800;
const ACTION_VISIBLE_MS = 6000;
/** Failures are read, not glanced at, and often say what to do next. */
const ERROR_VISIBLE_MS = 5000;

const TONES: Record<
  ToastTone,
  { icon: keyof typeof Feather.glyphMap; fg: string; disc: string; edge: string }
> = {
  success: {
    icon: 'check',
    fg: colors.success,
    disc: 'rgba(62, 155, 110, 0.15)',
    edge: colors.success,
  },
  error: {
    icon: 'alert-circle',
    fg: colors.danger,
    disc: 'rgba(214, 69, 80, 0.15)',
    edge: colors.danger,
  },
  info: {
    icon: 'info',
    fg: colors.gold,
    disc: colors.goldFaint,
    edge: colors.gold,
  },
};

/**
 * Lightweight, dependency-free toast. Drops in from the top under the status
 * bar, fades in, auto-dismisses, tap-to-dismiss. Used for the feedback moments
 * in the client browse design (Second Look's "He's back!", Like confirmation)
 * and for failures that would otherwise be a line of red text nobody looks at.
 *
 * Top rather than bottom: the bottom of a phone screen is where the tab bar and
 * the action row live, so a toast there covered the very controls it was
 * reporting on.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  // Negative: the toast sits at the top, so it drops in from above the notch
  // rather than rising from a bottom edge it no longer occupies.
  const translateY = useRef(new Animated.Value(-16)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: -16, duration: 180, useNativeDriver: false }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (title: string, subtitle?: string, action?: ToastAction, tone: ToastTone = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      idRef.current += 1;
      setToast({ id: idRef.current, title, subtitle, action, tone });
      opacity.setValue(0);
      translateY.setValue(-16);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: false }),
      ]).start();
      // An actionable toast stays up longer: a CTA that vanishes before it can
      // be tapped is worse than no CTA at all. A failure stays longer again,
      // because it usually explains what to do about it.
      const life = action ? ACTION_VISIBLE_MS : tone === 'error' ? ERROR_VISIBLE_MS : VISIBLE_MS;
      timer.current = setTimeout(hide, life);
    },
    [hide, opacity, translateY],
  );

  const error = useCallback(
    (title: string, subtitle?: string, action?: ToastAction) =>
      show(title, subtitle, action, 'error'),
    [show],
  );

  const tone = TONES[toast?.tone ?? 'success'];

  return (
    <ToastContext.Provider value={{ show, error }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            // Clear of the status bar and the notch, whatever the device.
            { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
          ]}
        >
          <View
            style={styles.toast}
            accessibilityRole="alert"
            accessibilityLiveRegion={toast.tone === 'error' ? 'assertive' : 'polite'}
          >
            {/* A coloured edge so the kind of message reads before the words do. */}
            <View style={[styles.edge, { backgroundColor: tone.edge }]} />

            <View style={[styles.disc, { backgroundColor: tone.disc }]}>
              <Feather name={tone.icon} size={15} color={tone.fg} />
            </View>

            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.subtitle ? (
                <Text style={styles.sub} numberOfLines={3}>
                  {toast.subtitle}
                </Text>
              ) : null}
              {toast.action ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const act = toast.action;
                    hide();
                    act?.onPress();
                  }}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.action,
                    hovered ? styles.actionHover : null,
                    pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                  ]}
                >
                  <Text style={styles.actionText}>{toast.action.label}</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable onPress={hide} hitSlop={10} accessibilityLabel="Dismiss">
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 420,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    boxShadow: '0 12px 32px rgba(46, 18, 64, 0.18)',
  },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  disc: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 1 },
  title: { ...type.body, fontFamily: 'Inter_600SemiBold' },
  sub: { ...type.caption, lineHeight: 18 },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  actionHover: { backgroundColor: colors.primaryHover },
  // The bold face by name, not `fontWeight`: Android pairs a weight with a
  // family rather than synthesising one, so `fontWeight` on a family that only
  // ships Regular drops the toast action back to the system font.
  actionText: { ...type.caption, color: colors.onPrimary, fontFamily: fonts.bodyBold },
});
