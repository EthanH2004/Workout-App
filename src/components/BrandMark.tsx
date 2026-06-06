import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '../theme/tokens';

/**
 * Placeholder brand mark (§2.11 / §11): a rounded accent tile with the upward
 * progress-line glyph (echoes the 1RM chart). Wordmark/logo aren't final yet.
 */
export function BrandMark({ size = 64 }: { size?: number }) {
  const glyph = Math.round(size * 0.5);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        backgroundColor: colors.accentSubtle,
        borderWidth: 1,
        borderColor: colors.accentBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 17l5-6 4 3 7-9"
          stroke={colors.accent}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M20 5h-4M20 5v4"
          stroke={colors.accent}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
