import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fontFamily } from '../../theme/tokens';
import type { ChartPoint } from './progressData';

const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 20;
const PAD_B = 16;
const GRAD_ID = 'lineFill';

interface LineChartProps {
  points: ChartPoint[]; // oldest → newest
  formatValue: (v: number) => string;
  scrubIndex: number | null;
  onScrub: (index: number | null) => void;
  height?: number;
}

/**
 * Apple-Stocks-style line chart (§8.8): 2.5px accent line, soft gradient fill,
 * ≤3 gridlines with right-edge labels, violet PR points, and a draggable scrub
 * line + value bubble. Drag horizontally to read values; release resets.
 */
export function LineChart({ points, formatValue, scrubIndex, onScrub, height = 176 }: LineChartProps) {
  const [w, setW] = useState(0);
  const lastIdx = useSharedValue(-1);
  const n = points.length;

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const gesture = useMemo(() => {
    const plotW = w - PAD_L - PAD_R;
    return Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onBegin((e) => {
        if (n < 2) return;
        const idx = Math.min(Math.max(Math.round(((e.x - PAD_L) / plotW) * (n - 1)), 0), n - 1);
        lastIdx.value = idx;
        runOnJS(onScrub)(idx);
      })
      .onUpdate((e) => {
        if (n < 2) return;
        const idx = Math.min(Math.max(Math.round(((e.x - PAD_L) / plotW) * (n - 1)), 0), n - 1);
        if (idx !== lastIdx.value) {
          lastIdx.value = idx;
          runOnJS(onScrub)(idx);
        }
      })
      .onFinalize(() => {
        lastIdx.value = -1;
        runOnJS(onScrub)(null);
      });
  }, [w, n, onScrub, lastIdx]);

  const geom = useMemo(() => {
    if (w === 0 || n === 0) return null;
    const plotW = w - PAD_L - PAD_R;
    const plotTop = PAD_T;
    const plotBottom = height - PAD_B;
    const values = points.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin;
    const pad = range > 0 ? range * 0.18 : Math.max(1, dataMax * 0.1);
    const vMax = dataMax + pad;
    const vMin = Math.max(0, dataMin - pad);
    const span = vMax - vMin || 1;
    const x = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => plotBottom - ((v - vMin) / span) * (plotBottom - plotTop);
    const gridLines = [vMax, (vMax + vMin) / 2, vMin].map((v) => ({ y: y(v), label: Math.round(v) }));
    return { plotW, plotTop, plotBottom, x, y, gridLines };
  }, [w, n, points, height]);

  return (
    <GestureDetector gesture={gesture}>
      <View onLayout={onLayout} style={{ height }}>
        {geom ? (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.3} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {geom.gridLines.map((g, i) => (
              <Line key={i} x1={0} y1={g.y} x2={w} y2={g.y} stroke={colors.chartGridline} strokeWidth={1} />
            ))}
            {geom.gridLines.map((g, i) => (
              <SvgText
                key={`l${i}`}
                x={w - 2}
                y={g.y - 3}
                textAnchor="end"
                fontSize={9}
                fontFamily={fontFamily.regular}
                fill={colors.textTertiary}
              >
                {String(g.label)}
              </SvgText>
            ))}

            {n >= 2 ? (
              <>
                <Polygon
                  points={`${points.map((p, i) => `${geom.x(i)},${geom.y(p.value)}`).join(' ')} ${geom.x(n - 1)},${geom.plotBottom} ${geom.x(0)},${geom.plotBottom}`}
                  fill={`url(#${GRAD_ID})`}
                />
                <Polyline
                  points={points.map((p, i) => `${geom.x(i)},${geom.y(p.value)}`).join(' ')}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}

            {/* PR points — the only place violet appears */}
            {points.map((p, i) =>
              p.isPR ? (
                <Circle key={`pr${i}`} cx={geom.x(i)} cy={geom.y(p.value)} r={8} fill="none" stroke={colors.pr} strokeOpacity={0.35} strokeWidth={1} />
              ) : null,
            )}
            {points.map((p, i) =>
              p.isPR ? <Circle key={`prd${i}`} cx={geom.x(i)} cy={geom.y(p.value)} r={4.5} fill={colors.pr} /> : null,
            )}

            {n === 1 ? <Circle cx={geom.x(0)} cy={geom.y(points[0].value)} r={4} fill={colors.accent} /> : null}

            {scrubIndex != null && scrubIndex < n ? (
              <Scrub
                cx={geom.x(scrubIndex)}
                cy={geom.y(points[scrubIndex].value)}
                top={geom.plotTop}
                bottom={geom.plotBottom}
                width={w}
                label={`${points[scrubIndex].label} · ${formatValue(points[scrubIndex].value)}`}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
    </GestureDetector>
  );
}

function Scrub({
  cx,
  cy,
  top,
  bottom,
  width,
  label,
}: {
  cx: number;
  cy: number;
  top: number;
  bottom: number;
  width: number;
  label: string;
}) {
  const bubbleW = Math.max(56, label.length * 6 + 16);
  const bx = Math.min(Math.max(cx - bubbleW / 2, 0), width - bubbleW);
  return (
    <>
      <Line x1={cx} y1={top} x2={cx} y2={bottom} stroke={colors.chartScrubLine} strokeWidth={1} strokeDasharray="3 3" />
      <Rect x={bx} y={0} width={bubbleW} height={18} rx={4} fill={colors.surfaceOverlay} />
      <SvgText
        x={bx + bubbleW / 2}
        y={12.5}
        textAnchor="middle"
        fontSize={10}
        fontFamily={fontFamily.regular}
        fill={colors.textPrimary}
      >
        {label}
      </SvgText>
      <Circle cx={cx} cy={cy} r={4.5} fill={colors.textPrimary} />
      <Circle cx={cx} cy={cy} r={4.5} fill="none" stroke={colors.accent} strokeWidth={2} />
    </>
  );
}
