import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, shell } from '../theme';

/**
 * Shared UI-lift profile pieces: Hinge-style vitals strip, gold gradient
 * section header (psec), happn-style icon chip (bchip), detail row (srow).
 * Used by the full profile and the browse story panel.
 */

export function VitalsStrip({
  releaseDate,
  state,
  acceptsMail,
}: {
  releaseDate: string | null;
  state: string | null;
  acceptsMail: boolean;
}) {
  return (
    <View style={vs.strip}>
      <View style={vs.cell}>
        <Feather name="clock" size={17} color={colors.gold} />
        <Text style={vs.label}>COMING HOME</Text>
        <Text style={vs.value}>{releaseDate ?? 'Date not yet set'}</Text>
      </View>
      <View style={[vs.cell, vs.cellDivider]}>
        <Feather name="home" size={17} color={colors.gold} />
        <Text style={vs.label}>LOCATED IN</Text>
        <Text style={vs.value}>{state ?? 'Not listed'}</Text>
      </View>
      <View style={[vs.cell, vs.cellDivider]}>
        <Feather name="mail" size={17} color={colors.gold} />
        <Text style={vs.label}>MAIL</Text>
        <Text style={vs.value}>{acceptsMail ? 'Accepted' : 'Not accepted'}</Text>
      </View>
    </View>
  );
}

/** Gold gradient-text uppercase section header with a fading hairline rule. */
export function SectionHeader({ label }: { label: string }) {
  return (
    <View style={ps.row}>
      <Text style={ps.label}>{label.toUpperCase()}</Text>
      <View style={ps.rule} />
    </View>
  );
}

/** White chip, gold hairline border, optional leading Feather icon.
 *  Micro-interaction: hover lift + gold shadow (web). */
export function BChip({ label, icon }: { label: string; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <Pressable
      style={({ hovered }: { hovered?: boolean }) => [
        bc.chip,
        webHover,
        hovered ? bc.chipHover : null,
      ]}
    >
      {icon ? <Feather name={icon} size={14} color={colors.gold} /> : null}
      <Text style={bc.text}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={bc.row}>{children}</View>;
}

/** Hairline-divided icon row: "Label  Value" (no chevron). */
export function SRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <Pressable
      style={({ hovered }: { hovered?: boolean }) => [
        sr.row,
        webHover,
        hovered ? sr.rowHover : null,
      ]}
    >
      <Feather name={icon} size={16} color={colors.gold} />
      <Text style={sr.label}>{label}</Text>
      <Text style={sr.value}>{value}</Text>
    </Pressable>
  );
}

const webHover =
  Platform.OS === 'web'
    ? ({
        transitionProperty: 'transform, box-shadow, border-color, background-color',
        transitionDuration: '150ms',
      } as object)
    : null;

const vs = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,168,79,0.35)',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFDFA',
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(180deg, #FFFDFA, #FBF4EC)' } as object,
    }),
  },
  cell: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 6 },
  cellDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(214,168,79,0.25)' },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  value: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

const ps = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26, marginBottom: 10 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    letterSpacing: 2,
    color: colors.gold,
    ...Platform.select({
      web: {
        backgroundImage: shell.goldTextGradientCss,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      } as object,
    }),
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(214,168,79,0.4)',
    ...Platform.select({
      web: {
        backgroundColor: 'transparent',
        backgroundImage: 'linear-gradient(90deg, rgba(214,168,79,0.4), transparent)',
      } as object,
    }),
  },
});

const bc = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(214,168,79,0.45)',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipHover: {
    borderColor: colors.goldBright,
    transform: [{ translateY: -1 }],
    boxShadow: '0 4px 12px rgba(214,168,79,0.25)',
  },
  text: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.textPrimary },
});

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  rowHover: { backgroundColor: 'rgba(214,168,79,0.05)' },
  label: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  value: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.textPrimary, marginLeft: 4 },
});
