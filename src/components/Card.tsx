import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, elevation, layout, radius } from '../theme/tokens';

type CardVariant = 'surface' | 'raised';

interface CardProps {
  children: ReactNode;
  /** `surface` is the resting layer (elev-1); `raised` is the active/featured card (elev-2). */
  variant?: CardVariant;
  /** Featured/selected card: a 1px accent outline over the same fill (§8.5). */
  accentBorder?: boolean;
  /** Override the default 16pt card padding (e.g. tighter stat cards). */
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

const FILL: Record<CardVariant, string> = {
  surface: colors.surface,
  raised: colors.surfaceRaised,
};

const SHADOW: Record<CardVariant, ViewStyle> = {
  surface: elevation.elev1,
  raised: elevation.elev2,
};

/**
 * Content card (§8.5): depth via the surface ramp + a soft supporting shadow,
 * 12pt radius. Cards never rely on shadow alone — the lightness step leads.
 */
export function Card({
  children,
  variant = 'surface',
  accentBorder = false,
  padding = layout.cardPadding,
  style,
}: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: FILL[variant],
          borderRadius: radius.md,
          padding,
        },
        SHADOW[variant],
        accentBorder ? { borderWidth: 1, borderColor: colors.accentBorder } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
