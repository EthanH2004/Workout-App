import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontFamily, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

interface RangeChipsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Range selector (§8.8): a row of small pills (e.g. 1M · 3M · 6M · 1Y · All).
 * Active = accent fill + near-black label; inactive = quiet text, no fill.
 */
export function RangeChips<T extends string>({
  options,
  value,
  onChange,
  style,
}: RangeChipsProps<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={{ top: spacing[2], bottom: spacing[2] }}
            onPress={() => onChange(option)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text
              variant="caption"
              color={active ? 'textOnAccent' : 'textSecondary'}
              style={styles.label}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  chip: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  label: {
    fontFamily: fontFamily.medium,
  },
});
