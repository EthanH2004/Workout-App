import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typography, type ColorToken, type TypeVariant } from '../theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: ColorToken;
}

/**
 * Typography primitive. Applies a type-scale role + a semantic color token, so
 * no screen ever hardcodes a font, size, or color. Use this instead of RN <Text>.
 */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
