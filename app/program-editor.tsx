import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { List, Plus, Trash } from 'phosphor-react-native';
import { Button, DraggableList, Input, ScreenScaffold, SectionLabel, Text } from '../src/components';
import { colors, layout, spacing } from '../src/theme/tokens';
import type { ProgramDay } from '../src/features/routines/routinesStore';
import { usePrograms } from '../src/features/routines/usePrograms';

const plural = (n: number) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`;

/** Program editor (§ program model): rename, manage and reorder days, delete. */
export default function ProgramEditorScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const { state, findProgram, addDay, deleteDay, deleteProgram, renameProgram, reorderDays } =
    usePrograms();
  const program = findProgram(programId);
  const [name, setName] = useState(program?.name ?? '');

  // Persist the rename once (on blur / Done), not on every keystroke.
  const commitName = () => {
    const trimmed = name.trim();
    if (program && trimmed && trimmed !== program.name) renameProgram(program.id, trimmed);
  };

  const header = (
    <View style={styles.nav}>
      <View style={styles.navSpacer} />
      <Text variant="headline">Edit program</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          commitName();
          router.back();
        }}
        hitSlop={spacing[2]}
      >
        <Text variant="bodyStrong" color="accentText">
          Done
        </Text>
      </Pressable>
    </View>
  );

  if (!program || !programId) {
    return (
      <ScreenScaffold header={header}>
        <Text variant="body" color="textSecondary" style={styles.gone}>
          {state === 'loading' ? 'Loading…' : 'This program is no longer available.'}
        </Text>
      </ScreenScaffold>
    );
  }

  const editDay = (dayId: string) =>
    router.push({ pathname: '/routine-builder', params: { dayId } });

  function onAddDay() {
    const dayId = addDay(programId, `Day ${program!.days.length + 1}`);
    if (dayId) editDay(dayId);
  }

  function confirmDeleteDay(day: ProgramDay) {
    Alert.alert('Delete day?', `"${day.name}" will be removed from this program.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDay(day.id) },
    ]);
  }

  function confirmDeleteProgram() {
    Alert.alert('Delete program?', `"${program!.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProgram(programId);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScreenScaffold header={header}>
      <Input
        label="Program name"
        value={name}
        onChangeText={setName}
        onBlur={commitName}
        placeholder="Program name"
        autoCapitalize="sentences"
      />

      <SectionLabel style={styles.daysLabel}>{`Days · ${program.days.length}`}</SectionLabel>

      {program.days.length === 0 ? (
        <Text variant="body" color="textSecondary" style={styles.emptyHint}>
          Add your first day to build this program.
        </Text>
      ) : (
        <DraggableList
          items={program.days}
          keyForItem={(d) => d.id}
          onReorder={(ids) => reorderDays(programId, ids)}
          renderContent={(day, drag) => {
            const handle = (
              <View style={styles.handle}>
                <List size={20} color={colors.textTertiary} weight="bold" />
              </View>
            );
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${day.name}`}
                onPress={() => editDay(day.id)}
                style={({ pressed }) => [styles.dayRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {day.name}
                  </Text>
                  <Text variant="caption" color="textSecondary" style={styles.subTight}>
                    {plural(day.exercises.length)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${day.name}`}
                  onPress={() => confirmDeleteDay(day)}
                  hitSlop={spacing[2]}
                  style={({ pressed }) => [styles.trash, pressed && { opacity: 0.6 }]}
                >
                  <Trash size={18} color={colors.textTertiary} weight="regular" />
                </Pressable>
                {drag ? <GestureDetector gesture={drag}>{handle}</GestureDetector> : handle}
              </Pressable>
            );
          }}
        />
      )}

      <Button
        label="Add day"
        variant="secondary"
        onPress={onAddDay}
        icon={<Plus size={18} color={colors.textPrimary} weight="bold" />}
        style={styles.addDay}
      />

      <Pressable
        accessibilityRole="button"
        onPress={confirmDeleteProgram}
        style={({ pressed }) => [styles.deleteProgram, pressed && { opacity: 0.6 }]}
      >
        <Text variant="bodyStrong" color="destructive">
          Delete program
        </Text>
      </Pressable>
    </ScreenScaffold>
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
    paddingVertical: spacing[2],
  },
  navSpacer: {
    width: layout.minTapTarget,
  },
  gone: {
    marginTop: spacing[8],
    textAlign: 'center',
  },
  daysLabel: {
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  emptyHint: {
    paddingVertical: spacing[5],
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4] - 2,
    paddingHorizontal: spacing[4] - 2,
  },
  subTight: {
    marginTop: spacing[1] / 2,
  },
  trash: {
    padding: spacing[1],
  },
  handle: {
    paddingVertical: spacing[1],
    paddingLeft: spacing[1],
  },
  addDay: {
    marginTop: spacing[2],
  },
  deleteProgram: {
    alignItems: 'center',
    paddingVertical: spacing[5],
    marginTop: spacing[4],
  },
});
