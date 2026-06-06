import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretLeft, DotsThreeVertical } from 'phosphor-react-native';
import {
  Card,
  RangeChips,
  ScreenScaffold,
  SectionLabel,
  SegmentedControl,
  Text,
} from '../src/components';
import type { ColorToken } from '../src/theme/tokens';
import { colors, icon, layout, radius, spacing } from '../src/theme/tokens';
import { groupThousands } from '../src/utils/format';
import {
  liftDetail,
  METRIC_LABEL,
  RANGES,
  type Metric,
  type Range,
} from '../src/features/progress/progressData';
import { LineChart } from '../src/features/progress/LineChart';
import { useUnit } from '../src/features/settings/settingsStore';

const METRIC_OPTIONS: { label: string; value: Metric }[] = [
  { label: 'Est. 1RM', value: 'e1rm' },
  { label: 'Volume', value: 'volume' },
  { label: 'Heaviest', value: 'heaviest' },
];

// Preview loading / empty / thin on the simulator; null = populated.
const FORCE_STATE: 'loading' | 'empty' | 'thin' | null = null;

/** Exercise detail (§2.8): one lift's trend over time, Apple-Stocks feel. */
export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useUnit();
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [range, setRange] = useState<Range>('3M');
  const [scrub, setScrub] = useState<number | null>(null);

  const base = id ? liftDetail(id, metric, range, unit) : null;
  const detail =
    base && FORCE_STATE === 'thin'
      ? { ...base, points: base.points.slice(-1), delta: 0, thin: true }
      : base;

  const resetScrub = () => setScrub(null);
  const changeMetric = (m: Metric) => {
    setMetric(m);
    resetScrub();
  };
  const changeRange = (r: Range) => {
    setRange(r);
    resetScrub();
  };

  const header = (
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.navIcon}>
        <CaretLeft size={icon.size.standard} color={colors.textPrimary} weight="bold" />
      </Pressable>
      <Text variant="headline" numberOfLines={1} style={styles.navTitle}>
        {detail?.name ?? 'Exercise'}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Options" onPress={() => {}} style={styles.navIcon}>
        <DotsThreeVertical size={20} color={colors.textPrimary} weight="bold" />
      </Pressable>
    </View>
  );

  if (FORCE_STATE === 'empty' || !detail) {
    return (
      <ScreenScaffold header={header}>
        <Text variant="body" color="textSecondary" style={styles.empty}>
          No history yet — log this exercise to see its trend.
        </Text>
      </ScreenScaffold>
    );
  }

  if (FORCE_STATE === 'loading') {
    return (
      <ScreenScaffold header={header}>
        <View style={[styles.skeleton, { height: 44, marginTop: spacing[1] }]} />
        <View style={[styles.skeleton, { height: 176, marginTop: spacing[4] }]} />
      </ScreenScaffold>
    );
  }

  const heroValue = scrub != null && detail.points[scrub] ? detail.points[scrub].value : detail.heroValue;
  const deltaStr = `${detail.delta >= 0 ? '+' : ''}${groupThousands(detail.delta)} · ${detail.deltaLabel}`;
  const deltaColor: ColorToken = detail.delta >= 0 ? 'accentText' : 'textSecondary';

  return (
    <ScreenScaffold header={header}>
      <SegmentedControl
        options={METRIC_OPTIONS}
        value={metric}
        onChange={changeMetric}
        variant="neutral"
        style={styles.metric}
      />

      <SectionLabel>{METRIC_LABEL[metric]}</SectionLabel>
      <View style={styles.heroRow}>
        <Text variant="displayL">{groupThousands(heroValue)}</Text>
        <Text variant="caption" color="textSecondary" style={styles.unit}>
          {detail.unit}
        </Text>
        {!detail.thin ? (
          <Text variant="caption" color={deltaColor} style={styles.delta}>
            {deltaStr}
          </Text>
        ) : null}
      </View>

      <LineChart
        points={detail.points}
        formatValue={(v) => groupThousands(v)}
        scrubIndex={scrub}
        onScrub={setScrub}
      />

      <RangeChips options={RANGES} value={range} onChange={changeRange} style={styles.range} />

      <View style={styles.statRow}>
        <StatCardSmall label="Best set" value={detail.bestSet} />
        <StatCardSmall label="Heaviest" value={detail.heaviestLabel} />
        <StatCardSmall label="PR · 1RM" value={detail.prLabel} valueColor="pr" />
      </View>

      <SectionLabel style={styles.historyLabel}>History</SectionLabel>
      {detail.history.map((h, i) => (
        <View key={`${h.dateLabel}-${i}`} style={[styles.hrow, i > 0 && styles.divider]}>
          <Text variant="caption" color="textPrimary" style={styles.hDate}>
            {h.dateLabel}
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.hBest}>
            {h.bestSet}
          </Text>
          <Text variant="caption" color="textPrimary" style={styles.hE1rm}>
            {groupThousands(h.e1rm)}
          </Text>
          {h.isPR ? <View style={styles.prDot} /> : <View style={styles.prDotSpacer} />}
        </View>
      ))}
    </ScreenScaffold>
  );
}

function StatCardSmall({
  label,
  value,
  valueColor = 'textPrimary',
}: {
  label: string;
  value: string;
  valueColor?: ColorToken;
}) {
  return (
    <Card padding={spacing[3]} style={styles.flex}>
      <SectionLabel>{label}</SectionLabel>
      <Text variant="headline" color={valueColor} style={styles.statValue}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  navIcon: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
  },
  metric: {
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing[1],
  },
  unit: {
    marginLeft: spacing[1],
  },
  delta: {
    marginLeft: spacing[3],
    fontVariant: ['tabular-nums'],
  },
  range: {
    justifyContent: 'space-between',
    marginTop: spacing[3],
    marginBottom: spacing[5],
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing[2] + 2,
  },
  statValue: {
    marginTop: spacing[1],
    fontVariant: ['tabular-nums'],
  },
  historyLabel: {
    marginTop: spacing[6],
    marginBottom: spacing[1],
  },
  hrow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  divider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  hDate: {
    width: 84,
    fontVariant: ['tabular-nums'],
  },
  hBest: {
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  hE1rm: {
    fontVariant: ['tabular-nums'],
  },
  prDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.pr,
    marginLeft: spacing[2],
  },
  prDotSpacer: {
    width: 7,
    marginLeft: spacing[2],
  },
  empty: {
    marginTop: spacing[8],
    textAlign: 'center',
  },
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
});
