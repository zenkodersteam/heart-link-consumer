import { Feather } from '@expo/vector-icons';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, cta, depth, radii, spacing, themedStyles, type } from '../theme';

/**
 * In-app confirmation and choice dialog.
 *
 * Replaces React Native's `Alert`, which is **not implemented on web** — on the
 * web build those calls did nothing at all, so deleting an account, reporting a
 * profile and blocking someone were silently dead. On phones it worked but
 * looked like a system dialog dropped into the middle of the brand.
 *
 * One component covers both shapes we need: a destructive confirm (two buttons)
 * and a short list of choices (report reasons), because they are the same
 * object with a different number of actions.
 */
export interface DialogAction {
  label: string;
  onPress: () => void;
  /** Red, for actions that destroy something. */
  destructive?: boolean;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  /** Shown above the title. Use for the one thing the person must not miss. */
  icon?: keyof typeof Feather.glyphMap;
  actions: DialogAction[];
  cancelLabel?: string;
  onCancel: () => void;
  /** Disables every control while an action is in flight. */
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  icon,
  actions,
  cancelLabel = 'Cancel',
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  const destructive = actions.some((a) => a.destructive);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping the backdrop cancels, which is what people expect and what
          the system dialog did. */}
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {icon ? (
            <View style={[styles.iconWrap, destructive ? styles.iconWrapDanger : null]}>
              <Feather
                name={icon}
                size={20}
                color={destructive ? colors.danger : colors.primary}
              />
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                disabled={busy}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.action,
                  a.destructive ? styles.actionDanger : styles.actionPrimary,
                  pressed && !busy ? { transform: [{ scale: 0.98 }] } : null,
                  busy ? { opacity: 0.6 } : null,
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    a.destructive ? styles.actionTextDanger : styles.actionTextPrimary,
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }: { pressed: boolean }) => [
                styles.action,
                styles.actionQuiet,
                pressed && !busy ? { transform: [{ scale: 0.98 }] } : null,
              ]}
            >
              <Text style={[styles.actionText, styles.actionTextQuiet]}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22,5,31,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    // Floating: this sits above the screen it is asking about.
    ...depth.floating,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
    marginBottom: 2,
  },
  iconWrapDanger: { backgroundColor: 'rgba(179,37,63,0.10)' },
  title: { ...type.h2, color: colors.textPrimary },
  message: { ...type.body, color: colors.textSecondary, lineHeight: 21 },
  actions: { gap: 8, marginTop: spacing.md },
  action: {
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionPrimary: { backgroundColor: colors.primary, boxShadow: cta.glow },
  actionDanger: { backgroundColor: colors.danger },
  actionQuiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14.5 },
  actionTextPrimary: { color: colors.onPrimary },
  actionTextDanger: { color: colors.onPrimary },
  actionTextQuiet: { color: colors.textSecondary },
}));
