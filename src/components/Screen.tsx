import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '../theme/tokens';

interface ScreenProps {
  children?: ReactNode;
  /** Center children both axes (used by the M0 placeholders). */
  center?: boolean;
  /** Apply the default 16pt horizontal screen padding. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Page canvas: near-black background + top safe-area inset + screen padding. */
export function Screen({ children, center = false, padded = true, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: insets.top,
          paddingHorizontal: padded ? layout.screenPaddingX : 0,
        },
        center && { alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
