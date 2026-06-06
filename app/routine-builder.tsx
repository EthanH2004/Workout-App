import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { List, Minus, Plus } from 'phosphor-react-native';
import {
  Button,
  DraggableList,
  EquipmentIcon,
  Input,
  ScreenScaffold,
  SectionLabel,
  Text,
} from '../src/components';
import type { Equipment } from '../src/components';
import { colors, layout, radius, spacing } from '../src/theme/tokens';
import { uuid } from '../src/utils/uuid';
import { requestExercises } from '../src/features/exercises/pickerHandoff';
import { usePrograms, type SaveDayItem } from '../src/features/routines/usePrograms';

type PanGesture = ReturnType<typeof Gesture.Pan>;

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;

interface EditRow {
  key: string;
  exerciseId: string;
  name: string;
  equipment: Equipment | null;
  targetSets: number;
  targetReps: number;
}

const snapshot = (name: string, rows: EditRow[]) =>
  JSON.stringify({
    name: name.trim(),
    rows: rows.map((r) => ({ id: r.exerciseId, s: r.targetSets, r: r.targetReps })),
  });

/** Day editor (§2.5 / program model): edit one program day's name + exercises. */
export default function DayEditorScreen() {
  const router = useRouter();
  const { dayId } = useLocalSearchParams<{ dayId?: string }>();
  const { state, findDay, saveDay } = usePrograms();
  const initial = useRef(dayId ? findDay(dayId) : null);

  const [name, setName] = useState(initial.current?.day.name ?? '');
  const [rows, setRows] = useState<EditRow[]>(() =>
    (initial.current?.day.exercises ?? []).map((e) => ({
      key: e.id,
      exerciseId: e.exerciseId,
      name: e.name,
      equipment: e.equipment,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
    })),
  );
  const baseline = useRef(snapshot(initial.current?.day.name ?? '', rows));

  const dirty = snapshot(name, rows) !== baseline.current;
  const valid = name.trim().length > 0;

  function addExercises() {
    requestExercises((picked) => {
      setRows((prev) => [
        ...prev,
        ...picked.map((p) => ({
          key: uuid(),
          exerciseId: p.id,
          name: p.name,
          equipment: p.equipment,
          targetSets: DEFAULT_SETS,
          targetReps: DEFAULT_REPS,
        })),
      ]);
    });
    router.push('/exercise-picker');
  }

  const step = (key: string, field: 'targetSets' | 'targetReps', delta: number) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: Math.max(1, r[field] + delta) } : r)),
    );

  const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const reorder = (keys: string[]) =>
    setRows((prev) => keys.map((k) => prev.find((r) => r.key === k)).filter(Boolean) as EditRow[]);

  function save() {
    if (!dayId) return;
    // key = the day_exercise id for existing rows, a fresh UUID for new ones;
    // the hook diffs against the cached day to insert / update / soft-delete.
    const items: SaveDayItem[] = rows.map((r) => ({
      id: r.key,
      exerciseId: r.exerciseId,
      name: r.name,
      equipment: r.equipment,
      targetSets: r.targetSets,
      targetReps: r.targetReps,
    }));
    saveDay(dayId, name.trim(), items);
    router.back();
  }

  function cancel() {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits to this day will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  const header = (
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" onPress={cancel} hitSlop={spacing[2]}>
        <Text variant="bodyStrong" color="textSecondary">
          Cancel
        </Text>
      </Pressable>
      <Text variant="headline">Edit day</Text>
      <Pressable accessibilityRole="button" onPress={save} disabled={!valid} hitSlop={spacing[2]}>
        <Text variant="bodyStrong" color={valid ? 'accentText' : 'textDisabled'}>
          Save
        </Text>
      </Pressable>
    </View>
  );

  if (!dayId || !initial.current) {
    return (
      <ScreenScaffold header={header}>
        <Text variant="body" color="textSecondary" style={styles.gone}>
          {state === 'loading' ? 'Loading…' : 'This day is no longer available.'}
        </Text>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      header={header}
      footer={<Button label="Save day" onPress={save} disabled={!valid} />}
    >
      <Input
        label="Day name"
        value={name}
        onChangeText={setName}
        placeholder="Day name"
        autoCapitalize="sentences"
      />

      <SectionLabel style={styles.exLabel}>{`Exercises · ${rows.length}`}</SectionLabel>

      {rows.length === 0 ? (
        <Text variant="body" color="textSecondary" style={styles.emptyHint}>
          Add your first exercise to build this day.
        </Text>
      ) : (
        <DraggableList
          items={rows}
          keyForItem={(r) => r.key}
          onReorder={reorder}
          renderContent={(row, drag) => (
            <ExerciseCardInner row={row} drag={drag} onStep={step} onRemove={remove} />
          )}
        />
      )}

      <Button
        label="Add exercise"
        variant="secondary"
        onPress={addExercises}
        icon={<Plus size={18} color={colors.textPrimary} weight="bold" />}
        style={styles.addExercise}
      />
    </ScreenScaffold>
  );
}

/* --------------------------------- pieces --------------------------------- */

function ExerciseCardInner({
  row,
  drag,
  onStep,
  onRemove,
}: {
  row: EditRow;
  drag: PanGesture | undefined;
  onStep: (key: string, field: 'targetSets' | 'targetReps', delta: number) => void;
  onRemove: (key: string) => void;
}) {
  const handle = (
    <View style={styles.handle} accessibilityLabel="Drag to reorder">
      <List size={20} color={colors.textTertiary} weight="bold" />
    </View>
  );
  return (
    <View style={styles.cardPad}>
      <View style={styles.exHead}>
        <EquipmentIcon equipment={row.equipment} size={21} />
        <Text variant="headline" numberOfLines={1} style={styles.exName}>
          {row.name}
        </Text>
        {drag ? <GestureDetector gesture={drag}>{handle}</GestureDetector> : handle}
      </View>

      <View style={styles.cfg}>
        <Stepper
          label="Sets"
          value={row.targetSets}
          onMinus={() => onStep(row.key, 'targetSets', -1)}
          onPlus={() => onStep(row.key, 'targetSets', 1)}
        />
        <Stepper
          label="Target reps"
          value={row.targetReps}
          onMinus={() => onStep(row.key, 'targetReps', -1)}
          onPlus={() => onStep(row.key, 'targetReps', 1)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onRemove(row.key)}
        style={({ pressed }) => [styles.removeRow, pressed && { opacity: 0.6 }]}
      >
        <Minus size={14} color={colors.textTertiary} weight="bold" />
        <Text variant="caption" color="textTertiary">
          Remove
        </Text>
      </Pressable>
    </View>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <View style={styles.stepperCtrl}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={onMinus}
          hitSlop={spacing[2]}
          style={({ pressed }) => [styles.pm, pressed && { opacity: 0.6 }]}
        >
          <Minus size={16} color={colors.textSecondary} weight="bold" />
        </Pressable>
        <Text variant="numInline" style={styles.stepperValue}>
          {String(value)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={onPlus}
          hitSlop={spacing[2]}
          style={({ pressed }) => [styles.pm, pressed && { opacity: 0.6 }]}
        >
          <Plus size={16} color={colors.textSecondary} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  gone: {
    marginTop: spacing[8],
    textAlign: 'center',
  },
  exLabel: {
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  emptyHint: {
    paddingVertical: spacing[5],
    textAlign: 'center',
  },
  addExercise: {
    marginTop: spacing[2],
  },
  cardPad: {
    paddingTop: layout.cardPaddingMin,
    paddingHorizontal: layout.cardPaddingMin,
    paddingBottom: spacing[1],
  },
  exHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  exName: {
    flex: 1,
  },
  handle: {
    paddingVertical: spacing[1],
    paddingLeft: spacing[2],
  },
  cfg: {
    flexDirection: 'row',
    gap: spacing[2] + 2,
    paddingBottom: spacing[3],
  },
  stepper: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  stepperCtrl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1] + 1,
  },
  stepperValue: {
    fontVariant: ['tabular-nums'],
  },
  pm: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1] + 2,
    paddingVertical: spacing[3] - 1,
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
});
