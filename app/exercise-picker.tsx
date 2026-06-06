import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, MagnifyingGlass, Plus } from 'phosphor-react-native';
import {
  Button,
  EquipmentIcon,
  Input,
  ScreenScaffold,
  SectionLabel,
  Text,
} from '../src/components';
import type { Equipment } from '../src/components';
import { colors, fontFamily, icon, layout, radius, spacing, typography } from '../src/theme/tokens';
import {
  createCustomExercise,
  MUSCLE_LABEL,
  MUSCLE_ORDER,
  useExerciseCatalog,
  type CatalogExercise,
  type Muscle,
} from '../src/features/exercises/exerciseCatalog';
import { cancelExerciseRequest, deliverExercises } from '../src/features/exercises/pickerHandoff';

const EQUIPMENT_OPTIONS: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'bodyweight',
  'band',
  'plate',
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Exercise Picker (§2.6): shared catalog, multi-select, modal. */
export default function ExercisePickerScreen() {
  const router = useRouter();
  const { state, refetch } = useExerciseCatalog();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Muscle | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState<CatalogExercise[]>([]);
  const [createName, setCreateName] = useState<string | null>(null); // non-null = form open

  const catalog = state.status === 'ready' ? state.exercises : [];
  const all = useMemo(() => [...catalog, ...custom], [catalog, custom]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = all.filter(
      (e) =>
        (filter === 'all' || e.muscle === filter) &&
        (q === '' || e.name.toLowerCase().includes(q)),
    );
    return MUSCLE_ORDER.map((muscle) => ({
      muscle,
      items: matches.filter((e) => e.muscle === muscle),
    })).filter((g) => g.items.length > 0);
  }, [all, filter, query]);

  const totalMatches = groups.reduce((n, g) => n + g.items.length, 0);
  const selectedCount = selected.size;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    deliverExercises(all.filter((e) => selected.has(e.id)));
    router.back();
  }

  function cancel() {
    cancelExerciseRequest();
    router.back();
  }

  function handleCreate(name: string, muscle: Muscle, equipment: Equipment) {
    const exercise = createCustomExercise(name, muscle, equipment);
    setCustom((prev) => [...prev, exercise]);
    setSelected((prev) => new Set(prev).add(exercise.id));
    setCreateName(null);
  }

  // ---- create-exercise sub-view ----
  if (createName !== null) {
    return (
      <CreateExerciseForm
        initialName={createName}
        initialMuscle={filter === 'all' ? 'chest' : filter}
        onCancel={() => setCreateName(null)}
        onCreate={handleCreate}
      />
    );
  }

  const header = (
    <>
      <NavRow
        title="Add exercise"
        leftLabel="Cancel"
        onLeft={cancel}
        rightLabel={selectedCount > 0 ? `Done · ${selectedCount}` : 'Done'}
        onRight={confirm}
      />
      <View style={styles.search}>
        <MagnifyingGlass size={19} color={colors.textTertiary} weight="regular" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        {MUSCLE_ORDER.map((m) => (
          <Chip
            key={m}
            label={MUSCLE_LABEL[m]}
            active={filter === m}
            onPress={() => setFilter(m)}
          />
        ))}
      </ScrollView>
    </>
  );

  const footer =
    selectedCount > 0 ? (
      <Button
        label={`Add ${selectedCount} ${selectedCount === 1 ? 'exercise' : 'exercises'}`}
        onPress={confirm}
      />
    ) : undefined;

  return (
    <ScreenScaffold header={header} footer={footer}>
      {state.status === 'loading' ? <CatalogSkeleton /> : null}

      {state.status === 'error' ? <ErrorBlock onRetry={refetch} /> : null}

      {state.status === 'ready' ? (
        <>
          {groups.map((group) => (
            <View key={group.muscle}>
              <SectionLabel color="textTertiary" style={styles.groupLabel}>
                {MUSCLE_LABEL[group.muscle]}
              </SectionLabel>
              {group.items.map((exercise) => (
                <CatalogRow
                  key={exercise.id}
                  exercise={exercise}
                  selected={selected.has(exercise.id)}
                  onToggle={() => toggle(exercise.id)}
                />
              ))}
            </View>
          ))}

          {totalMatches === 0 ? (
            <Text variant="body" color="textSecondary" style={styles.noMatch}>
              {query.trim() ? `No matches for "${query.trim()}"` : 'No exercises yet'}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setCreateName(query.trim())}
            style={({ pressed }) => [styles.createRow, pressed && styles.rowPressed]}
          >
            <Plus size={20} color={colors.accentText} weight="bold" />
            <Text variant="bodyStrong" color="accentText">
              {query.trim() ? `Create "${query.trim()}"` : 'Create custom exercise'}
            </Text>
          </Pressable>
        </>
      ) : null}
    </ScreenScaffold>
  );
}

/* --------------------------------- pieces --------------------------------- */

function NavRow({
  title,
  leftLabel,
  onLeft,
  rightLabel,
  onRight,
}: {
  title: string;
  leftLabel: string;
  onLeft: () => void;
  rightLabel?: string;
  onRight?: () => void;
}) {
  return (
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" onPress={onLeft} hitSlop={spacing[2]}>
        <Text variant="bodyStrong" color="textSecondary">
          {leftLabel}
        </Text>
      </Pressable>
      <Text variant="headline">{title}</Text>
      {rightLabel && onRight ? (
        <Pressable accessibilityRole="button" onPress={onRight} hitSlop={spacing[2]}>
          <Text variant="bodyStrong" color="accentText">
            {rightLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text variant="caption" color={active ? 'textOnAccent' : 'textSecondary'} style={styles.chipLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function CatalogRow({
  exercise,
  selected,
  onToggle,
}: {
  exercise: CatalogExercise;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <EquipmentIcon equipment={exercise.equipment} size={22} />
      <View style={styles.rowInfo}>
        <Text variant="bodyStrong">{exercise.name}</Text>
        <Text variant="caption" color="textSecondary" style={styles.rowSub}>
          {`${MUSCLE_LABEL[exercise.muscle]} · ${capitalize(exercise.equipment)}`}
        </Text>
      </View>
      <View style={[styles.selectCircle, selected && styles.selectCircleOn]}>
        {selected ? <Check size={14} color={colors.textOnAccent} weight="bold" /> : null}
      </View>
    </Pressable>
  );
}

function CreateExerciseForm({
  initialName,
  initialMuscle,
  onCancel,
  onCreate,
}: {
  initialName: string;
  initialMuscle: Muscle;
  onCancel: () => void;
  onCreate: (name: string, muscle: Muscle, equipment: Equipment) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<Muscle>(initialMuscle);
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const valid = name.trim().length > 0;

  return (
    <ScreenScaffold header={<NavRow title="New exercise" leftLabel="Back" onLeft={onCancel} />}>
      <View style={styles.formField}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Exercise name"
          autoFocus
          autoCapitalize="sentences"
        />
      </View>

      <SectionLabel style={styles.formLabel}>Muscle group</SectionLabel>
      <View style={styles.chipWrap}>
        {MUSCLE_ORDER.map((m) => (
          <Chip key={m} label={MUSCLE_LABEL[m]} active={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </View>

      <SectionLabel style={styles.formLabel}>Equipment</SectionLabel>
      <View style={styles.chipWrap}>
        {EQUIPMENT_OPTIONS.map((e) => (
          <Chip
            key={e}
            label={capitalize(e)}
            active={equipment === e}
            onPress={() => setEquipment(e)}
          />
        ))}
      </View>

      <Button
        label="Create exercise"
        disabled={!valid}
        onPress={() => onCreate(name, muscle, equipment)}
        style={styles.createButton}
      />
    </ScreenScaffold>
  );
}

function CatalogSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: 7 }, (_, i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorBlock}>
      <Text variant="body" color="textSecondary">
        Couldn't load exercises
      </Text>
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={spacing[2]}>
        <Text variant="bodyStrong" color="accentText">
          Retry
        </Text>
      </Pressable>
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
  navSpacer: {
    width: layout.minTapTarget,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: layout.inputHeight,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    marginTop: spacing[1],
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: typography.body.fontSize,
    padding: 0,
  },
  chips: {
    gap: spacing[2],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    paddingVertical: spacing[2] - 1,
    paddingHorizontal: spacing[3] + 2,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipLabel: {
    fontFamily: fontFamily.medium,
  },
  groupLabel: {
    marginTop: spacing[4],
    marginBottom: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
  },
  rowInfo: {
    flex: 1,
  },
  rowSub: {
    marginTop: spacing[1] / 2,
  },
  selectCircle: {
    width: icon.size.standard,
    height: icon.size.standard,
    borderRadius: radius.full,
    borderWidth: icon.stroke,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  noMatch: {
    marginTop: spacing[5],
    textAlign: 'center',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[1],
    marginTop: spacing[2],
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  formField: {
    marginTop: spacing[2],
  },
  formLabel: {
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  createButton: {
    marginTop: spacing[8],
  },
  skeletonWrap: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  skeletonRow: {
    height: layout.listRowHeight,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
  },
  errorBlock: {
    marginTop: spacing[8],
    alignItems: 'center',
    gap: spacing[3],
  },
});
