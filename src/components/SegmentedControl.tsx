import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontFamily, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** `accent` (default): accent fill + near-black label. `neutral`: surfaceHigh fill + white. */
  variant?: 'accent' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

/**
 * Segmented control (settings + exercise-detail mockups): a `surfaceRaised` track
 * holding equal segments; the selected segment is an accent fill with a near-black
 * label. Inner radius is one step tighter than the track (nesting rule, §4).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'accent',
  style,
}: SegmentedControlProps<T>) {
  const activeColor = variant === 'neutral' ? 'textPrimary' : 'textOnAccent';
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active && (variant === 'neutral' ? styles.activeNeutral : styles.activeAccent),
            ]}
          >
            <Text
              variant="caption"
              color={active ? activeColor : 'textSecondary'}
              style={styles.label}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing[1],
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderRadius: radius.xs,
  },
  activeAccent: {
    backgroundColor: colors.accent,
  },
  activeNeutral: {
    backgroundColor: colors.surfaceHigh,
  },
  label: {
    fontFamily: fontFamily.medium,
  },
});
