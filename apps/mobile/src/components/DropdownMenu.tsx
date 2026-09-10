import { Feather } from '@expo/vector-icons';
import { useCallback, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, themedStyles } from '../theme';

export interface MenuItem {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Draws a hairline above this item, to separate a group. */
  separated?: boolean;
}

/**
 * Menu anchored to the control that opened it.
 *
 * A centred dialog is the wrong shape for "more actions": it takes over the
 * screen for a list of links and hides the thing you were looking at. This
 * hangs off the button instead, which is what a menu does on a phone.
 *
 * Still a Modal underneath, because that is the only way to escape the parent's
 * overflow clipping and sit above everything else.
 */
export function DropdownMenu({
  open,
  onClose,
  items,
  anchor,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  /**
   * Screen position of the control that opened it, so the menu hangs directly
   * below rather than at a guessed offset that could sit over the button.
   */
  anchor?: { top: number; right: number } | null;
}) {
  const top = anchor?.top ?? 96;
  const right = anchor?.right ?? spacing.md;

  /**
   * Run the chosen action only once this menu has actually gone.
   *
   * iOS silently drops a modal presented while another is still dismissing, so
   * closing the menu and opening a confirmation in the same tick meant Report
   * and Block appeared to do nothing at all. The action is held until the
   * dismissal completes.
   */
  const pending = useRef<(() => void) | null>(null);

  const runPending = useCallback(() => {
    const fn = pending.current;
    pending.current = null;
    fn?.();
  }, []);

  const choose = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return;
      pending.current = item.onPress;
      onClose();
      // onDismiss is iOS-only; elsewhere the modal is gone by the next frame.
      if (Platform.OS !== 'ios') setTimeout(runPending, 0);
    },
    [onClose, runPending],
  );

  return (
    <Modal
      visible={open}
      transparent
      // No dismiss animation: the confirmation cannot open until this has gone,
      // so a fade here was pure waiting between tapping Report and seeing it.
      animationType="none"
      onRequestClose={onClose}
      onDismiss={runPending}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { top, right }]}>
          {items.map((item) => (
            <Pressable
              hitSlop={8}
              key={item.label}
              onPress={() => choose(item)}
              disabled={item.disabled}
              style={({ pressed }: { pressed: boolean }) => [
                styles.item,
                item.separated ? styles.itemSeparated : null,
                pressed && !item.disabled ? { backgroundColor: colors.surfaceMuted } : null,
                item.disabled ? { opacity: 0.45 } : null,
              ]}
            >
              {item.icon ? (
                <Feather
                  name={item.icon}
                  size={16}
                  color={item.destructive ? colors.danger : colors.textSecondary}
                />
              ) : null}
              <Text
                numberOfLines={1} maxFontSizeMultiplier={1.4}
                style={[styles.label, item.destructive ? styles.labelDanger : null]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,5,31,0.28)' },
  sheet: {
    position: 'absolute',
    // Wide enough that the labels below never wrap onto a second line.
    minWidth: 258,
    maxWidth: 320,
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 18px 44px rgba(46,18,64,0.26)',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  itemSeparated: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 13 },
  label: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14.5, color: colors.textPrimary },
  labelDanger: { color: colors.danger, fontFamily: 'Inter_600SemiBold' },
}));
