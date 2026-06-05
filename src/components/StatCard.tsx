import { View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '../theme/tokens';
import { Card } from './Card';
import { SectionLabel } from './SectionLabel';
import { Text } from './Text';

interface StatCardProps {
  /** Overline label, e.g. "Workouts · 7d". */
  label: string;
  /** The big expanded numeral, pre-formatted (e.g. "22,400" or "3"). */
  value: string | number;
  /** Optional standard-width unit suffix sitting on the numeral's baseline (e.g. "lb"). */
  unit?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single quiet stat: overline label above one confident Expanded tabular number
 * (§2.3 numEmphasis). Used in the Home "Last 7 days" strip and the Profile grid.
 * The caller positions it (e.g. `flex: 1` inside a row).
 */
export function StatCard({ label, value, unit, style }: StatCardProps) {
  return (
    <Card padding={spacing[4] - 2} style={style}>
      <SectionLabel>{label}</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing[1] }}>
        <Text variant="numEmphasis">{String(value)}</Text>
        {unit ? (
          <Text variant="caption" color="textSecondary" style={{ marginLeft: spacing[1] }}>
            {unit}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
