import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

/** Optional call-to-action rendered inside the toast. */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  id: number;
  title: string;
  subtitle?: string;
  action?: ToastAction;
}

interface ToastApi {
  show: (title: string, subtitle?: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const VISIBLE_MS = 2800;
const ACTION_VISIBLE_MS = 6000;

/**
 * Lightweight, dependency-free toast. Slides up + fades in, auto-dismisses,
 * tap-to-dismiss. Used for Second Look ("He's back!") and Like confirmation -
 * the feedback moments in the client browse design (screen 5).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 16, duration: 180, useNativeDriver: false }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (title: string, subtitle?: string, action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current);
      idRef.current += 1;
      setToast({ id: idRef.current, title, subtitle, action });
      opacity.setValue(0);
      translateY.setValue(16);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: false }),
        Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: false }),
      ]).start();
      // An actionable toast stays up longer: a CTA that vanishes before it can
      // be tapped is worse than no CTA at all.
      timer.current = setTimeout(hide, action ? ACTION_VISIBLE_MS : VISIBLE_MS);
    },
    [hide, opacity, translateY],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
        >
          <View style={styles.toast}>
            <View style={styles.check}>
              <Text style={styles.checkGlyph}>✓</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
              {toast.subtitle ? (
                <Text style={styles.sub} numberOfLines={2}>{toast.subtitle}</Text>
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
            <Pressable onPress={hide} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
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
    bottom: spacing.xxl,
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
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    boxShadow: '0 12px 32px rgba(46, 18, 64, 0.18)',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(62, 155, 110, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: { color: colors.success, fontSize: 15, fontFamily: 'Inter_700Bold' },
  copy: { flex: 1, gap: 1 },
  title: { ...type.body, fontFamily: 'Inter_600SemiBold' },
  sub: { ...type.caption },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  actionHover: { backgroundColor: colors.primaryHover },
  actionText: { ...type.caption, color: colors.onPrimary, fontWeight: '700' },
  close: { ...type.body, color: colors.textMuted, paddingHorizontal: spacing.xs },
});
