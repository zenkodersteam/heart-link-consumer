import { Feather } from '@expo/vector-icons';
import {
  MONTH_NAMES,
  WEEKDAY_INITIALS,
  birthYears,
  calendarStart,
  formatDobInput,
  monthGrid,
  parseDob,
  toDisplayDate,
} from '@heartlink/consumer-content';
import { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radii, spacing, themedStyles, type } from '../theme';

/**
 * A date field that can be typed or picked.
 *
 * Typing stays the primary path — anyone who knows their birth date types it
 * faster than a calendar allows — and the calendar is the way through for
 * everyone else. Both write the same `MM/DD/YYYY` the validation understands.
 *
 * Built in JS rather than on the platform date picker: that is a native module,
 * so adding it would mean a new binary before anyone could use this, and the
 * iOS wheel makes choosing a year forty years back a long scroll. The grid
 * here opens on a year that can simply be tapped.
 */
export function DateField({
  label,
  hint,
  error,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => calendarStart(value).year);
  const [month, setMonth] = useState(() => calendarStart(value).month);
  const [pickingYear, setPickingYear] = useState(false);

  // Opening shows whatever is currently typed rather than wherever the calendar
  // was left, and is set here rather than in an effect so the first frame is
  // already correct.
  const openCalendar = useCallback(() => {
    const start = calendarStart(value);
    setYear(start.year);
    setMonth(start.month);
    setPickingYear(false);
    setOpen(true);
  }, [value]);

  const step = (delta: number) => {
    const next = month + delta;
    if (next < 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else if (next > 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth(next);
    }
  };

  const selectedIso = parseDob(value);
  const cells = monthGrid(year, month);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          value={value}
          onChangeText={(text) => onChange(formatDobInput(text))}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={10}
          style={[styles.input]}
          accessibilityLabel={label}
        />
        <Pressable
          onPress={openCalendar}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Pick a date from a calendar"
          style={({ pressed }: { pressed: boolean }) => [
            styles.calendarBtn,
            pressed ? { opacity: 0.6 } : null,
          ]}
        >
          <Feather name="calendar" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Stops a tap inside the sheet from reaching the backdrop and
              closing the thing being used. */}
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => step(-1)}
                hitSlop={10}
                accessibilityLabel="Previous month"
                style={styles.arrow}
              >
                <Feather name="chevron-left" size={20} color={colors.textSecondary} />
              </Pressable>

              {/* The year is a button, not an arrow away: a birth date is
                  decades back, and paging there a month at a time is not a
                  thing anyone will do. */}
              <Pressable
                onPress={() => setPickingYear((picking) => !picking)}
                style={styles.headerTitle}
                accessibilityRole="button"
                accessibilityLabel={`${MONTH_NAMES[month]} ${year}. Change year`}
              >
                <Text style={styles.headerText}>
                  {MONTH_NAMES[month]} {year}
                </Text>
                <Feather
                  name={pickingYear ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={colors.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={() => step(1)}
                hitSlop={10}
                accessibilityLabel="Next month"
                style={styles.arrow}
              >
                <Feather name="chevron-right" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {pickingYear ? (
              <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
                {birthYears().map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setYear(option);
                      setPickingYear(false);
                    }}
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.yearRow,
                      option === year ? styles.yearRowActive : null,
                      pressed ? { opacity: 0.8 } : null,
                    ]}
                  >
                    <Text style={[styles.yearText, option === year ? styles.yearTextActive : null]}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <>
                <View style={styles.weekRow}>
                  {WEEKDAY_INITIALS.map((initial, index) => (
                    <Text key={`${initial}-${index}`} style={styles.weekday}>
                      {initial}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {cells.map((day, index) => {
                    if (day === null) return <View key={`empty-${index}`} style={styles.cell} />;
                    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const selected = selectedIso === iso;
                    return (
                      <Pressable
                        key={iso}
                        onPress={() => {
                          onChange(toDisplayDate(year, month, day));
                          setOpen(false);
                        }}
                        style={({ pressed }: { pressed: boolean }) => [
                          styles.cell,
                          selected ? styles.cellSelected : null,
                          pressed && !selected ? { backgroundColor: colors.surfaceMuted } : null,
                        ]}
                      >
                        <Text style={[styles.cellText, selected ? styles.cellTextSelected : null]}>
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text style={styles.doneText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  wrap: { gap: spacing.sm, marginBottom: spacing.lg },
  label: { ...type.caption, fontSize: 13, color: colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    paddingRight: spacing.sm,
  },
  inputRowError: { borderColor: colors.danger },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  calendarBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  hint: { ...type.caption, fontSize: 12 },
  error: { ...type.caption, fontSize: 12, color: colors.danger },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 5, 31, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    gap: spacing.md,
    boxShadow: '0 24px 60px rgba(22, 5, 31, 0.35)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerText: { ...type.body, fontFamily: 'Inter_600SemiBold' },

  weekRow: { flexDirection: 'row' },
  weekday: {
    ...type.caption,
    fontSize: 11,
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  cellSelected: { backgroundColor: colors.primary },
  cellText: { ...type.body, fontSize: 14 },
  cellTextSelected: { color: colors.onPrimary, fontFamily: 'Inter_600SemiBold' },

  // Tall enough to show several years without being the whole screen, so the
  // month it will return to stays visible behind the choice.
  yearList: { maxHeight: 260 },
  yearRow: { paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  yearRowActive: { backgroundColor: colors.primaryFaint },
  yearText: { ...type.body, fontSize: 15 },
  yearTextActive: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },

  done: { alignItems: 'center', paddingVertical: spacing.sm },
  doneText: { ...type.button, fontSize: 14, color: colors.primary },
}));
