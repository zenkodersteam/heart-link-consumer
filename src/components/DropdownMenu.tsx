import { Feather } from '@expo/vector-icons';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

const webTransition =
  Platform.OS === 'web'
    ? { transitionProperty: 'background-color, opacity', transitionDuration: '120ms', transitionTimingFunction: 'ease-out' }
    : null;

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
  top = 96,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** Distance from the top of the screen to hang the menu from. */
  top?: number;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { top }]}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                if (item.disabled) return;
                onClose();
                item.onPress();
              }}
              disabled={item.disabled}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.item,
                item.separated ? styles.itemSeparated : null,
                webTransition,
                hovered && !item.disabled ? { backgroundColor: colors.surfaceMuted } : null,
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
              <Text style={[styles.label, item.destructive ? styles.labelDanger : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,5,31,0.28)' },
  sheet: {
    position: 'absolute',
    right: spacing.md,
    minWidth: 232,
    maxWidth: 300,
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
});
