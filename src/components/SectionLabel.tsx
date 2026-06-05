import type { StyleProp, TextStyle } from 'react-native';
import { type ColorToken } from '../theme/tokens';
import { Text } from './Text';

interface SectionLabelProps {
  children: string;
  /** Overline labels are `textSecondary` by default; grouped lists use `textTertiary`. */
  color?: ColorToken;
  style?: StyleProp<TextStyle>;
}

/**
 * The `overline` role (§2.3): 11pt, 0.13em tracking, UPPERCASE. The single place
 * uppercase is allowed — section headers like "UP NEXT", "RECENT", "YOUR LIFTS".
 */
export function SectionLabel({ children, color = 'textSecondary', style }: SectionLabelProps) {
  return (
    <Text variant="overline" color={color} style={style}>
      {children}
    </Text>
  );
}
