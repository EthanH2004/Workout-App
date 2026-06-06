import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { Card, RangeChips, ScreenScaffold, SectionLabel, Text } from '../../src/components';
import { colors, fontFamily, layout, radius, spacing } from '../../src/theme/tokens';
import {
  progressLifts,
  RANGES,
  weeklyVolume,
  type ProgressLiftRow,
  type Range,
} from '../../src/features/progress/progressData';
import { BarChart, Sparkline } from '../../src/features/progress/ProgressCharts';
import { useUnit } from '../../src/features/settings/settingsStore';

// Preview empty / thin / loading / error on the simulator; null = populated.
const FORCE_STATE: 'empty' | 'thin' | 'loading' | 'error' | null = null;

/** Progress tab (§2.7): the calm gallery of gains. */
export default function ProgressScreen() {
  const router = useRouter();
  const unit = useUnit();
  const [range, setRange] = useState<Range>('3M');

  const vol = weeklyVolume(range, unit);
  const thin = FORCE_STATE === 'thin';
  const lifts = progressLifts(unit).map((l) =>
    thin ? { ...l, thin: true, deltaLb: 0, sparkline: l.sparkline.slice(-1) } : l,
  );
  const bars = thin ? vol.bars.slice(-1) : vol.bars;

  const openLift = (id: string) => router.push({ pathname: '/exercise-detail', params: { id } });

  const nav = (
    <View style={styles.nav}>
      <Text variant="title">Progress</Text>
    </View>
  );

  if (FORCE_STATE === 'loading') {
    return (
      <ScreenScaffold>
        {nav}
        <View style={[styles.skeleton, { height: 220 }]} />
        <View style={[styles.skeleton, styles.skeletonRow]} />
        <View style={[styles.skeleton, styles.skeletonRow]} />
      </ScreenScaffold>
    );
  }

  if (FORCE_STATE === 'empty') {
    return (
      <ScreenScaffold>
        {nav}
        <Text variant="body" color="textSecondary" style={styles.emptyHint}>
          Log a few workouts to see your progress here.
        </Text>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      {nav}

      {FORCE_STATE === 'error' ? <ErrorBanner /> : null}

      <SectionLabel style={styles.volLabel}>Total volume · weekly</SectionLabel>
      <Card>
        <View style={styles.heroRow}>
          <Text variant="displayL">{vol.totalLabel}</Text>
          <Text variant="caption" color="textSecondary" style={styles.unit}>
            {unit}
          </Text>
        </View>
        <Text
          variant="caption"
          color={vol.deltaPct >= 0 ? 'accentText' : 'textSecondary'}
          style={styles.volDelta}
        >
          {`${vol.deltaPct >= 0 ? '+' : ''}${vol.deltaPct}% vs last month`}
        </Text>
        <BarChart values={bars} />
        <RangeChips options={RANGES} value={range} onChange={setRange} style={styles.range} />
      </Card>

      <SectionLabel style={styles.liftsLabel}>Your lifts</SectionLabel>
      {lifts.map((lift, i) => (
        <LiftRow key={lift.id} lift={lift} first={i === 0} onPress={() => openLift(lift.id)} />
      ))}
    </ScreenScaffold>
  );
}

function LiftRow({
  lift,
  first,
  onPress,
}: {
  lift: ProgressLiftRow;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lift.name} progress`}
      onPress={onPress}
      style={({ pressed }) => [styles.liftRow, !first && styles.divider, pressed && styles.rowPressed]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong">{lift.name}</Text>
        <Text variant="caption" color="textSecondary" style={styles.liftSub}>
          {'est. 1RM '}
          <Text variant="caption" color="textPrimary" style={styles.liftValue}>
            {lift.e1rmLabel}
          </Text>
          {!lift.thin ? (
            <Text variant="caption" color={lift.deltaLb >= 0 ? 'accentText' : 'textSecondary'}>
              {`   ${lift.deltaLb >= 0 ? '+' : ''}${lift.deltaLb} · 90d`}
            </Text>
          ) : null}
        </Text>
      </View>
      <Sparkline values={lift.sparkline} />
      <CaretRight size={16} color={colors.textTertiary} weight="bold" />
    </Pressable>
  );
}

function ErrorBanner() {
  return (
    <View style={styles.banner}>
      <Text variant="caption" color="textSecondary" style={styles.flex}>
        Couldn't refresh
      </Text>
      <Pressable accessibilityRole="button" onPress={() => {}} hitSlop={spacing[2]}>
        <Text variant="caption" color="accentText">
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  nav: {
    paddingTop: spacing[1],
    paddingBottom: spacing[2],
  },
  volLabel: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  unit: {
    marginLeft: spacing[1],
  },
  volDelta: {
    marginTop: spacing[1] / 2,
    marginBottom: spacing[2],
    fontVariant: ['tabular-nums'],
  },
  range: {
    marginTop: spacing[3],
  },
  liftsLabel: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3] + 1,
    paddingHorizontal: spacing[1],
  },
  divider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
  },
  liftSub: {
    marginTop: spacing[1] / 2,
    fontVariant: ['tabular-nums'],
  },
  liftValue: {
    fontFamily: fontFamily.semibold,
  },
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    marginTop: spacing[3],
  },
  skeletonRow: {
    height: 56,
  },
  emptyHint: {
    marginTop: spacing[8],
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginTop: spacing[3],
  },
});
