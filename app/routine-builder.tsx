import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { List, Minus, Plus } from 'phosphor-react-native';
import {
  Button,
  EquipmentIcon,
  Input,
  ScreenScaffold,
  SectionLabel,
  Text,
} from '../src/components';
import type { Equipment } from '../src/components';
import { colors, elevation, layout, motion, radius, spacing } from '../src/theme/tokens';
import { uuid } from '../src/utils/uuid';
import { requestExercises } from '../src/features/exercises/pickerHandoff';
import {
  createRoutine,
  findDay,
  updateDay,
  type DayExerciseInput,
} from '../src/features/routines/routinesStore';

const GAP = spacing[3];
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

const listToObject = (rows: EditRow[]): Record<string, number> =>
  rows.reduce<Record<string, number>>((acc, r, i) => {
    acc[r.key] = i;
    return acc;
  }, {});

/** Routine Builder (§2.5): create/edit a routine's name + per-exercise targets. */
export default function RoutineBuilderScreen() {
  const router = useRouter();
  const { dayId } = useLocalSearchParams<{ dayId?: string }>();
  const isEditing = !!dayId;

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
  const valid = name.trim().length > 0 && rows.length > 0;

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

  function step(key: string, field: 'targetSets' | 'targetReps', delta: number) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: Math.max(1, r[field] + delta) } : r)),
    );
  }

  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function reorder(orderedKeys: string[]) {
    setRows((prev) => orderedKeys.map((k) => prev.find((r) => r.key === k)).filter(Boolean) as EditRow[]);
  }

  function save() {
    const exercises: DayExerciseInput[] = rows.map((r) => ({
      exerciseId: r.exerciseId,
      name: r.name,
      equipment: r.equipment,
      targetSets: r.targetSets,
      targetReps: r.targetReps,
    }));
    if (dayId) updateDay(dayId, { name: name.trim(), exercises });
    else createRoutine({ name: name.trim(), exercises });
    router.back();
  }

  function cancel() {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits to this routine will be lost.', [
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
      <Text variant="headline">{isEditing ? 'Edit routine' : 'New routine'}</Text>
      <Pressable accessibilityRole="button" onPress={save} disabled={!valid} hitSlop={spacing[2]}>
        <Text variant="bodyStrong" color={valid ? 'accentText' : 'textDisabled'}>
          Save
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenScaffold
      header={header}
      footer={<Button label="Save routine" onPress={save} disabled={!valid} />}
    >
      <Input
        label="Routine name"
        value={name}
        onChangeText={setName}
        placeholder="Routine name"
        autoCapitalize="sentences"
      />

      <SectionLabel style={styles.exLabel}>{`Exercises · ${rows.length}`}</SectionLabel>

      {rows.length === 0 ? (
        <Text variant="body" color="textSecondary" style={styles.emptyHint}>
          Add your first exercise to build this routine.
        </Text>
      ) : (
        <DraggableExercises rows={rows} onReorder={reorder} onStep={step} onRemove={remove} />
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

/* ----------------------------- draggable list ----------------------------- */

function objectMove(obj: Record<string, number>, from: number, to: number) {
  'worklet';
  const next: Record<string, number> = {};
  for (const id in obj) {
    if (obj[id] === from) next[id] = to;
    else if (obj[id] === to) next[id] = from;
    else next[id] = obj[id];
  }
  return next;
}

function orderFromPositions(positions: Record<string, number>) {
  'worklet';
  return Object.keys(positions).sort((a, b) => positions[a] - positions[b]);
}

function DraggableExercises({
  rows,
  onReorder,
  onStep,
  onRemove,
}: {
  rows: EditRow[];
  onReorder: (keys: string[]) => void;
  onStep: (key: string, field: 'targetSets' | 'targetReps', delta: number) => void;
  onRemove: (key: string) => void;
}) {
  const [rowHeight, setRowHeight] = useState(0);
  const positions = useSharedValue(listToObject(rows));

  // Keep positions in sync with adds/removes/reorders.
  useEffect(() => {
    positions.value = listToObject(rows);
  }, [rows, positions]);

  function measure(e: LayoutChangeEvent) {
    if (rowHeight === 0) setRowHeight(e.nativeEvent.layout.height + GAP);
  }

  // Until the first card is measured, render in normal flow (drag disabled).
  if (rowHeight === 0) {
    return (
      <View>
        {rows.map((row, i) => (
          <View key={row.key} onLayout={i === 0 ? measure : undefined} style={styles.flowCard}>
            <CardInner row={row} onStep={onStep} onRemove={onRemove} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ height: rows.length * rowHeight }}>
      {rows.map((row) => (
        <DragCard
          key={row.key}
          row={row}
          count={rows.length}
          rowHeight={rowHeight}
          positions={positions}
          onReorder={onReorder}
        >
          {(drag) => <CardInner row={row} drag={drag} onStep={onStep} onRemove={onRemove} />}
        </DragCard>
      ))}
    </View>
  );
}

function DragCard({
  row,
  count,
  rowHeight,
  positions,
  onReorder,
  children,
}: {
  row: EditRow;
  count: number;
  rowHeight: number;
  positions: SharedValue<Record<string, number>>;
  onReorder: (keys: string[]) => void;
  children: (drag: ReturnType<typeof Gesture.Pan>) => ReactNode;
}) {
  const key = row.key;
  const top = useSharedValue((positions.value[key] ?? 0) * rowHeight);
  const startTop = useSharedValue(0);
  const active = useSharedValue(false);

  useAnimatedReaction(
    () => positions.value[key],
    (cur, prev) => {
      if (cur !== undefined && cur !== prev && !active.value) {
        top.value = withSpring(cur * rowHeight, motion.spring);
      }
    },
  );

  // Long-press the handle to pick up — disambiguates from list scrolling.
  const drag = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.value = true;
      startTop.value = top.value;
    })
    .onUpdate((e) => {
      top.value = startTop.value + e.translationY;
      const newIndex = Math.min(Math.max(Math.round(top.value / rowHeight), 0), count - 1);
      const curIndex = positions.value[key];
      if (newIndex !== curIndex) {
        positions.value = objectMove(positions.value, curIndex, newIndex);
      }
    })
    .onEnd(() => {
      top.value = withSpring((positions.value[key] ?? 0) * rowHeight, motion.spring);
    })
    .onFinalize(() => {
      if (!active.value) return;
      active.value = false;
      runOnJS(onReorder)(orderFromPositions(positions.value));
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: top.value,
    zIndex: active.value ? 10 : 1,
    transform: [{ scale: withSpring(active.value ? 1.03 : 1, motion.spring) }],
    shadowOpacity: active.value ? elevation.elev2.shadowOpacity : elevation.elev1.shadowOpacity,
    shadowRadius: active.value ? elevation.elev2.shadowRadius : elevation.elev1.shadowRadius,
    elevation: active.value ? 12 : 8,
  }));

  return <Animated.View style={[styles.dragCard, style]}>{children(drag)}</Animated.View>;
}

function CardInner({
  row,
  drag,
  onStep,
  onRemove,
}: {
  row: EditRow;
  drag?: ReturnType<typeof Gesture.Pan>;
  onStep: (key: string, field: 'targetSets' | 'targetReps', delta: number) => void;
  onRemove: (key: string) => void;
}) {
  const handle = (
    <View style={styles.handle} accessibilityLabel="Drag to reorder">
      <List size={20} color={colors.textTertiary} weight="bold" />
    </View>
  );
  return (
    <>
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
    </>
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

const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  paddingTop: layout.cardPaddingMin,
  paddingHorizontal: layout.cardPaddingMin,
  paddingBottom: spacing[1],
} as const;

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
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
  flowCard: {
    ...cardStyle,
    ...elevation.elev1,
    marginBottom: GAP,
  },
  dragCard: {
    ...cardStyle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
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
