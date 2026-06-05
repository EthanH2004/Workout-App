import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'phosphor-react-native';
import { colors, icon, layout, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

export type SetRowState = 'completed' | 'active' | 'todo';

interface SetRowProps {
  /** 1-based set number shown in the leading column. */
  index: number;
  /** Weight value, already display-formatted for the active unit (e.g. "135"). */
  weight: string;
  reps: string;
  state: SetRowState;
  /** Tap the row → open the number pad for this set. */
  onPress?: () => void;
  /** Tap the check → toggle completion (confirms ghost values if untouched). */
  onToggleComplete?: () => void;
}

/**
 * The set-logging row (§8.4) — the heart of the app. `[set] [weight] [reps] [check]`.
 * `completed` shows solid numerals + a filled accent check (near-black tick); `active`
 * adds the accentSubtle highlight; `todo` shows ghost target numerals + an empty ring.
 * Numerals to enter (active/todo) render as ghost targets until logged.
 */
export function SetRow({ index, weight, reps, state, onPress, onToggleComplete }: SetRowProps) {
  const ghost = state !== 'completed';
  const valueColor = ghost ? 'ghostTarget' : 'textPrimary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, state === 'active' && styles.rowActive]}
    >
      <Text variant="caption" color="textSecondary" style={styles.setLabel}>
        {index}
      </Text>
      <Text variant="numInline" color={valueColor} style={styles.value}>
        {weight}
      </Text>
      <Text variant="numInline" color={valueColor} style={styles.value}>
        {reps}
      </Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state === 'completed' }}
        accessibilityLabel={`Set ${index} complete`}
        onPress={onToggleComplete}
        style={styles.checkTap}
      >
        <View style={[styles.check, state === 'completed' ? styles.checkDone : styles.checkTodo]}>
          {state === 'completed' ? (
            <Check size={14} color={colors.textOnAccent} weight="bold" />
          ) : null}
        </View>
      </Pressable>
    </Pressable>
  );
}

interface SetTableHeaderProps {
  /** Unit column heading, e.g. "Lbs" or "Kg". */
  weightLabel: string;
}

/** Column headings aligned to the SetRow grid (Set · weight · Reps · check). */
export function SetTableHeader({ weightLabel }: SetTableHeaderProps) {
  return (
    <View style={styles.header}>
      <Text variant="overline" color="textTertiary" style={styles.setLabel}>
        Set
      </Text>
      <Text variant="overline" color="textTertiary" style={styles.headerCol}>
        {weightLabel}
      </Text>
      <Text variant="overline" color="textTertiary" style={styles.headerCol}>
        Reps
      </Text>
      <View style={styles.checkTap} />
    </View>
  );
}

const COL_FIXED = layout.minTapTarget; // set-label and check columns

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: layout.rowPaddingY,
    paddingHorizontal: spacing[2],
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  rowActive: {
    backgroundColor: colors.accentSubtle,
    borderRadius: radius.sm,
    borderTopColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[2],
  },
  setLabel: {
    width: COL_FIXED,
    textAlign: 'left',
  },
  headerCol: {
    flex: 1,
    textAlign: 'center',
  },
  value: {
    flex: 1,
    textAlign: 'center',
  },
  checkTap: {
    width: COL_FIXED,
    minHeight: COL_FIXED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: icon.size.standard,
    height: icon.size.standard,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.accent,
  },
  checkTodo: {
    borderWidth: icon.stroke,
    borderColor: colors.borderStrong,
  },
});
