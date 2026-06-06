import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

/* --------------------------------- bars ----------------------------------- */

/** Weekly volume bars (§8.8): muted bars, the latest in accent, ≤3 gridlines. */
export function BarChart({ values, height = 112 }: { values: number[]; height?: number }) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const PAD_T = 8;
  const PAD_B = 4;
  const GAP = 6;
  const top = PAD_T;
  const bottom = height - PAD_B;
  const max = values.length ? Math.max(...values) : 0;
  const scaleMax = max > 0 ? max * 1.1 : 1;
  const barW = values.length ? (w - GAP * (values.length - 1)) / values.length : 0;
  const gridYs = [top, (top + bottom) / 2, bottom];

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && values.length > 0 ? (
        <Svg width={w} height={height}>
          {gridYs.map((y, i) => (
            <Line key={i} x1={0} y1={y} x2={w} y2={y} stroke={colors.chartGridline} strokeWidth={1} />
          ))}
          {values.map((v, i) => {
            const h = Math.max(2, (v / scaleMax) * (bottom - top));
            const x = i * (barW + GAP);
            const last = i === values.length - 1;
            return (
              <Rect
                key={i}
                x={x}
                y={bottom - h}
                width={barW}
                height={h}
                rx={3}
                fill={last ? colors.accent : colors.surfaceRaised}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

/* ------------------------------- sparkline -------------------------------- */

/** Tiny accent trend line for the "Your lifts" rows; a dot when data is thin. */
export function Sparkline({
  values,
  width = 74,
  height = 34,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const PAD = 4;
  if (values.length < 2) {
    return (
      <Svg width={width} height={height}>
        <Circle cx={width / 2} cy={height / 2} r={3} fill={colors.accent} />
      </Svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * (width - PAD * 2);
      const y = height - PAD - ((v - min) / span) * (height - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={pts}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
