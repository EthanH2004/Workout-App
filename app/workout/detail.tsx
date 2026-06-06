import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import { Card, ScreenScaffold, SectionLabel, StatCard, Text } from '../../src/components';
import { colors, icon, layout, radius, spacing } from '../../src/theme/tokens';
import { toDisplayInt, toDisplayWeight } from '../../src/utils/units';
import { formatLongDate, groupThousands } from '../../src/utils/format';
import { useUnit } from '../../src/features/settings/settingsStore';
import { useDeleteSession, useSessionDetail } from '../../src/features/workout/sessionDetail';

function durationLabel(min: number | null): string {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Read-only detail for a completed workout, with a Delete action. */
export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useUnit();
  const { state, refetch } = useSessionDetail(id);
  const { remove } = useDeleteSession();

  const detail = state.status === 'ready' ? state.detail : null;

  function confirmDelete() {
    if (!detail) return;
    Alert.alert('Delete workout?', 'This permanently removes this workout and its sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete workout',
        style: 'destructive',
        onPress: () => {
          remove(detail);
          router.back();
        },
      },
    ]);
  }

  const header = (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={styles.navIcon}
      >
        <CaretLeft size={icon.size.standard} color={colors.textPrimary} weight="bold" />
      </Pressable>
      <Text variant="headline" numberOfLines={1} style={styles.navTitle}>
        {detail?.name ?? 'Workout'}
      </Text>
      <View style={styles.navIcon} />
    </View>
  );

  if (state.status === 'loading') {
    return (
      <ScreenScaffold header={header}>
        <View style={[styles.skeleton, { height: 72, marginTop: spacing[2] }]} />
        <View style={[styles.skeleton, { height: 180, marginTop: spacing[4] }]} />
      </ScreenScaffold>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenScaffold header={header}>
        <View style={styles.center}>
          <Text variant="body" color="textSecondary" style={styles.centerText}>
            Couldn't load this workout.
          </Text>
          <Pressable accessibilityRole="button" onPress={refetch} hitSlop={spacing[2]} style={styles.retry}>
            <Text variant="bodyStrong" color="accentText">
              Retry
            </Text>
          </Pressable>
        </View>
      </ScreenScaffold>
    );
  }

  if (state.status === 'empty' || !detail) {
    return (
      <ScreenScaffold header={header}>
        <View style={styles.center}>
          <Text variant="body" color="textSecondary" style={styles.centerText}>
            This workout isn't available.
          </Text>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold header={header}>
      <Text variant="caption" color="textSecondary" style={styles.dateLine}>
        {`${formatLongDate(new Date(detail.startedAt))}  ·  ${durationLabel(detail.durationMin)}`}
      </Text>

      <View style={styles.statRow}>
        <StatCard
          label="Total volume"
          value={groupThousands(toDisplayInt(detail.totalVolumeKg, unit))}
          unit={unit}
          style={styles.statItem}
        />
        <StatCard label="Sets" value={detail.totalSets} style={styles.statItem} />
      </View>

      <SectionLabel style={styles.exLabel}>Exercises</SectionLabel>
      {detail.exercises.map((ex) => (
        <Card key={ex.id} style={styles.exCard}>
          <Text variant="headline" numberOfLines={1}>
            {ex.name}
          </Text>
          {ex.sets.map((s, i) => (
            <View key={`${ex.id}-${i}`} style={[styles.setLine, i > 0 && styles.setDivider]}>
              <Text variant="caption" color="textSecondary">{`Set ${s.setIndex}`}</Text>
              <Text variant="numInline" color="textPrimary" style={styles.setVal}>
                {s.weightKg != null
                  ? `${toDisplayWeight(s.weightKg, unit)} ${unit} × ${s.reps ?? '—'}`
                  : `— × ${s.reps ?? '—'}`}
              </Text>
            </View>
          ))}
        </Card>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={confirmDelete}
        style={({ pressed }) => [styles.delete, pressed && { opacity: 0.6 }]}
      >
        <Text variant="bodyStrong" color="destructive">
          Delete workout
        </Text>
      </Pressable>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
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
  dateLine: {
    marginTop: spacing[2],
    marginBottom: spacing[4],
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statItem: {
    flex: 1,
  },
  exLabel: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  exCard: {
    marginTop: spacing[3],
  },
  setLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3] - 2,
  },
  setDivider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  setVal: {
    fontVariant: ['tabular-nums'],
  },
  center: {
    marginTop: spacing[8],
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing[3],
  },
  delete: {
    alignItems: 'center',
    paddingVertical: spacing[5],
    marginTop: spacing[6],
  },
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
});
