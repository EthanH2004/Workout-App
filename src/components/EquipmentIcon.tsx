import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, icon, type ColorToken } from '../theme/tokens';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'plate'
  | 'bodyweight'
  | 'cable'
  | 'machine'
  | 'band';

interface EquipmentIconProps {
  /** Equipment category from the catalog. Unknown/null falls back to the barbell glyph. */
  equipment?: string | null;
  size?: number;
  color?: ColorToken;
}

/**
 * The custom per-equipment glyph set (§6): one icon per equipment *category*, all
 * drawn at the 1.5px round line style. barbell/dumbbell/cable/machine are reused
 * verbatim from the mockups; kettlebell/plate/bodyweight/band are drawn to match
 * (the mockups don't include them).
 */
export function EquipmentIcon({
  equipment,
  size = 22,
  color = 'textSecondary',
}: EquipmentIconProps) {
  const stroke = colors[color];
  const common = {
    stroke,
    strokeWidth: icon.stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const;

  const key = (equipment ?? '').toLowerCase() as Equipment;

  const glyphs: Record<Equipment, ReactNode> = {
    barbell: <Path {...common} d="M2 12h2M20 12h2M5 9v6M7 10.5v3M17 10.5v3M19 9v6M7 12h10" />,
    dumbbell: <Path {...common} d="M6.5 7v10M9.5 8.5v7M14.5 8.5v7M17.5 7v10M9.5 12h5" />,
    cable: (
      <>
        <Circle {...common} cx={12} cy={5} r={2.2} />
        <Path {...common} d="M12 7.2v5l-4 7M12 12.2l4 7" />
      </>
    ),
    machine: (
      <>
        <Rect {...common} x={4} y={4} width={16} height={16} rx={2} />
        <Path {...common} d="M4 14h7v6M14 4v6h6" />
      </>
    ),
    kettlebell: (
      <>
        <Path {...common} d="M9 9.5a3 3 0 0 1 6 0" />
        <Path
          {...common}
          d="M8.3 9.7C6.6 11 5.5 13.2 5.5 15.5A3.5 3.5 0 0 0 9 19h6a3.5 3.5 0 0 0 3.5-3.5c0-2.3-1.1-4.5-2.8-5.8"
        />
      </>
    ),
    plate: (
      <>
        <Circle {...common} cx={12} cy={12} r={8.5} />
        <Circle {...common} cx={12} cy={12} r={3} />
      </>
    ),
    bodyweight: (
      <>
        <Circle {...common} cx={12} cy={5} r={2.2} />
        <Path {...common} d="M12 7.2v6M12 9.5l-4 2M12 9.5l4 2M12 13.2l-3 5.5M12 13.2l3 5.5" />
      </>
    ),
    band: (
      <>
        <Path {...common} d="M3.5 9.3c2.8-2.4 5.7 2.4 8.5 0s5.7-2.4 8.5 0" />
        <Path {...common} d="M3.5 14.7c2.8-2.4 5.7 2.4 8.5 0s5.7-2.4 8.5 0" />
      </>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glyphs[key] ?? glyphs.barbell}
    </Svg>
  );
}
