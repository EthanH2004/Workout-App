import { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CaretDown, Clock, Plus } from 'phosphor-react-native';
import {
  Button,
  Card,
  EquipmentIcon,
  ScreenScaffold,
  SetRow,
  SetTableHeader,
  Text,
  type SetRowState,
} from '../../src/components';
import { colors, fontFamily, icon, layout, radius, spacing } from '../../src/theme/tokens';
import { fromDisplayWeight, toDisplayWeight } from '../../src/utils/units';
import {
  activeReducer,
  allSetsComplete,
  createEmptySession,
  createMockSession,
  firstIncompleteSetId,
  hasLoggedSets,
  incompleteSetsExcluding,
  type ActiveExercise,
  type ActiveSet,
  type LastTime,
} from '../../src/features/workout/activeWorkoutData';
import { NumberPadSheet } from '../../src/features/workout/NumberPadSheet';

const UNIT = 'lb';
const WEIGHT_LABEL = 'Lbs';

// Preview the empty / loading variants on the simulator; null = mid-session.
const FORCE_VARIANT: 'empty' | 'loading' | null = null;

/** The displayed weight/reps for a set: own values if logged, else the ghost target. */
function setValues(s: ActiveSet, lastTime: LastTime | null) {
  const hasOwn = s.weightKg != null && s.reps != null;
  const weightKg = hasOwn ? s.weightKg : (lastTime?.weightKg ?? null);
  const reps = hasOwn ? s.reps : (lastTime?.reps ?? null);
  return {
    weight: weightKg != null ? String(toDisplayWeight(weightKg, UNIT)) : '—',
    reps: reps != null ? String(reps) : '—',
  };
}

interface PadTarget {
  exerciseId: string;
  setId: string;
  mode: 'log' | 'edit';
  initialWeight: string;
  initialReps: string;
  isLast: boolean;
}

/** Pre-fill the pad from a set's displayed values, blanking the em-dash placeholder. */
function padPrefill(s: ActiveSet, lastTime: LastTime | null) {
  const values = setValues(s, lastTime);
  return {
    initialWeight: values.weight === '—' ? '' : values.weight,
    initialReps: values.reps === '—' ? '' : values.reps,
  };
}

/** Active workout (§2.2): full-screen logging loop, no tab bar. */
export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const [session, dispatch] = useReducer(
    activeReducer,
    FORCE_VARIANT === 'empty' ? createEmptySession() : createMockSession(),
  );

  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const timer = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  const [padTarget, setPadTarget] = useState<PadTarget | null>(null);

  const activeSetId = firstIncompleteSetId(session);
  const allDone = allSetsComplete(session);
  const isEmpty = session.exercises.length === 0;

  function openPad(exercise: ActiveExercise, s: ActiveSet) {
    const mode: 'log' | 'edit' = s.completed ? 'edit' : 'log';
    setPadTarget({
      exerciseId: exercise.id,
      setId: s.id,
      mode,
      isLast: mode === 'log' && incompleteSetsExcluding(session, s.id).length === 0,
      ...padPrefill(s, exercise.lastTime),
    });
  }

  function handlePadSubmit(weightDisplay: number, reps: number) {
    if (!padTarget) return;
    const weightKg = fromDisplayWeight(weightDisplay, UNIT);
    if (padTarget.mode === 'edit') {
      dispatch({ type: 'EDIT_SET', exerciseId: padTarget.exerciseId, setId: padTarget.setId, weightKg, reps });
      setPadTarget(null);
      return;
    }
    dispatch({ type: 'LOG_SET', exerciseId: padTarget.exerciseId, setId: padTarget.setId, weightKg, reps });
    // Advance to the next remaining set (excluding the one just logged) or close.
    const remaining = incompleteSetsExcluding(session, padTarget.setId);
    const next = remaining[0];
    if (!next) {
      setPadTarget(null);
      return;
    }
    setPadTarget({
      exerciseId: next.exercise.id,
      setId: next.set.id,
      mode: 'log',
      isLast: remaining.length === 1,
      ...padPrefill(next.set, next.exercise.lastTime),
    });
  }

  function handleClose() {
    if (hasLoggedSets(session)) {
      Alert.alert('Discard workout?', 'Your logged sets will be lost.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }

  function handleToggleComplete(exerciseId: string, set: ActiveSet) {
    if (!set.completed) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    dispatch({ type: 'TOGGLE_COMPLETE', exerciseId, setId: set.id });
  }

  // TODO(§2.6): open the Exercise picker; (§ summary) Finish writes PRs + shows summary.
  const handleAddExercise = () => {};
  const handleFinish = () => router.back();

  const header = (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close workout"
        onPress={handleClose}
        style={styles.navIcon}
      >
        <CaretDown size={icon.size.standard} color={colors.textPrimary} weight="bold" />
      </Pressable>
      <View style={styles.navCenter}>
        <Text variant="headline">{session.dayName}</Text>
        {session.groupName ? (
          <Text variant="overline" color="textTertiary" style={styles.navSub}>
            {session.groupName}
          </Text>
        ) : null}
      </View>
      <View style={styles.timer}>
        <Clock size={15} color={colors.accentText} weight="bold" />
        <Text variant="caption" color="accentText" style={styles.timerValue}>
          {timer}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenScaffold header={header}>
        {FORCE_VARIANT === 'loading' ? (
          <LoadingCards />
        ) : isEmpty ? (
          <EmptyWorkoutCard onAddExercise={handleAddExercise} />
        ) : (
          <>
            {session.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                raised={index === 0}
                first={index === 0}
                activeSetId={activeSetId}
                onPressSet={(set) => openPad(exercise, set)}
                onToggleComplete={(set) => handleToggleComplete(exercise.id, set)}
                onAddSet={() => dispatch({ type: 'ADD_SET', exerciseId: exercise.id })}
              />
            ))}

            <Button
              label="Add exercise"
              variant="secondary"
              onPress={handleAddExercise}
              icon={<Plus size={18} color={colors.textPrimary} weight="bold" />}
              style={styles.addExercise}
            />

            {allDone ? (
              <Text variant="caption" color="success" style={styles.allDone}>
                All sets complete
              </Text>
            ) : null}

            <Button label="Finish workout" onPress={handleFinish} style={styles.finish} />
          </>
        )}
      </ScreenScaffold>

      {padTarget ? (
        <NumberPadSheet
          setKey={padTarget.setId}
          initialWeight={padTarget.initialWeight}
          initialReps={padTarget.initialReps}
          unit={UNIT}
          mode={padTarget.mode}
          isLast={padTarget.isLast}
          onSubmit={handlePadSubmit}
          onClose={() => setPadTarget(null)}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------ exercise card ----------------------------- */

function ExerciseCard({
  exercise,
  raised,
  first,
  activeSetId,
  onPressSet,
  onToggleComplete,
  onAddSet,
}: {
  exercise: ActiveExercise;
  raised: boolean;
  first: boolean;
  activeSetId: string | null;
  onPressSet: (set: ActiveSet) => void;
  onToggleComplete: (set: ActiveSet) => void;
  onAddSet: () => void;
}) {
  return (
    <Card variant={raised ? 'raised' : 'surface'} style={first ? undefined : styles.cardGap}>
      <View style={styles.exHead}>
        <EquipmentIcon equipment={exercise.equipment} size={21} />
        <Text variant="headline" style={styles.exName} numberOfLines={1}>
          {exercise.name}
        </Text>
        {exercise.prLive ? <PRChip /> : null}
      </View>

      {exercise.lastTime ? (
        <Text variant="caption" color="textTertiary" style={styles.lastTime}>
          {`Last time · ${exercise.lastTime.dateLabel} · ${String(
            toDisplayWeight(exercise.lastTime.weightKg, UNIT),
          )} × ${exercise.lastTime.reps}`}
        </Text>
      ) : null}

      <SetTableHeader weightLabel={WEIGHT_LABEL} />

      {exercise.sets.map((s) => {
        const values = setValues(s, exercise.lastTime);
        const state: SetRowState = s.completed
          ? 'completed'
          : s.id === activeSetId
            ? 'active'
            : 'todo';
        return (
          <SetRow
            key={s.id}
            index={s.setIndex}
            weight={values.weight}
            reps={values.reps}
            state={state}
            onPress={() => onPressSet(s)}
            onToggleComplete={() => onToggleComplete(s)}
          />
        );
      })}

      <Pressable
        accessibilityRole="button"
        onPress={onAddSet}
        style={({ pressed }) => [styles.addSet, pressed && { opacity: 0.6 }]}
      >
        <Plus size={15} color={colors.accentText} weight="bold" />
        <Text variant="caption" color="accentText" style={styles.addSetLabel}>
          Add set
        </Text>
      </Pressable>
    </Card>
  );
}

function PRChip() {
  return (
    <View style={styles.prChip}>
      <Text variant="overline" color="pr">
        PR
      </Text>
    </View>
  );
}

/* -------------------------------- variants -------------------------------- */

function EmptyWorkoutCard({ onAddExercise }: { onAddExercise: () => void }) {
  return (
    <Card variant="raised" style={styles.emptyCard}>
      <Text variant="title">Empty workout</Text>
      <Text variant="body" color="textSecondary" style={styles.emptyBody}>
        Add your first exercise to start logging sets.
      </Text>
      <Button
        label="Add exercise"
        onPress={onAddExercise}
        icon={<Plus size={18} color={colors.textOnAccent} weight="bold" />}
        style={styles.emptyButton}
      />
    </Card>
  );
}

function LoadingCards() {
  return (
    <>
      <View style={[styles.skeleton, { height: 220 }]} />
      <View style={[styles.skeleton, styles.cardGap, { height: 168 }]} />
      <View style={[styles.skeleton, styles.cardGap, { height: 140 }]} />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
  },
  navIcon: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navSub: {
    marginTop: spacing[1] / 2,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    width: layout.minTapTarget + spacing[6], // balances the left icon so the title centers
    justifyContent: 'flex-end',
  },
  timerValue: {
    fontFamily: fontFamily.medium,
    fontVariant: ['tabular-nums'],
  },
  cardGap: {
    marginTop: spacing[3],
  },
  exHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2] + 2,
  },
  exName: {
    flex: 1,
  },
  lastTime: {
    marginTop: spacing[1],
    marginBottom: spacing[3],
    fontVariant: ['tabular-nums'],
  },
  prChip: {
    backgroundColor: colors.prSubtle,
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2,
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1] + 2,
    paddingTop: spacing[3],
    marginTop: spacing[1] / 2,
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  addSetLabel: {
    fontFamily: fontFamily.medium,
  },
  addExercise: {
    marginTop: spacing[4],
  },
  allDone: {
    textAlign: 'center',
    marginTop: spacing[4],
  },
  finish: {
    marginTop: spacing[3],
  },
  emptyCard: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  emptyBody: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
  emptyButton: {
    marginTop: spacing[5],
    alignSelf: 'stretch',
  },
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
});
