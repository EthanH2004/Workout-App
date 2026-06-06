import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { List, Play, Plus } from 'phosphor-react-native';
import { Card, EquipmentIcon, ScreenScaffold, SectionLabel, Text } from '../../src/components';
import { colors, icon, layout, radius, spacing } from '../../src/theme/tokens';
import {
  cloneTemplate,
  groupExerciseCount,
  TEMPLATES,
  useRoutineGroups,
  type RoutineGroup,
  type RoutineTemplate,
} from '../../src/features/routines/routinesStore';

// Preview loading / error / empty on the simulator; null = populated.
const FORCE_STATE: 'loading' | 'error' | 'empty' | null = null;

const pluralExercises = (n: number) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`;

/** Routines tab (§2.4): saved routines, a new-routine entry, and templates. */
export default function RoutinesScreen() {
  const router = useRouter();
  const groups = useRoutineGroups();

  const newRoutine = () => router.push('/routine-builder');
  const editDay = (dayId: string) => router.push({ pathname: '/routine-builder', params: { dayId } });
  // Generic active session for now; wiring the specific day in is a follow-up.
  const startDay = (_dayId: string) => router.push('/workout/active');
  const addTemplate = (t: RoutineTemplate) => {
    const result = cloneTemplate(t.id);
    if (result) router.push({ pathname: '/routine-builder', params: { dayId: result.firstDayId } });
  };

  const nav = (
    <View style={styles.nav}>
      <Text variant="title">Routines</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New routine"
        onPress={newRoutine}
        style={styles.iconBtn}
      >
        <Plus size={22} color={colors.textPrimary} weight="bold" />
      </Pressable>
    </View>
  );

  const templates = (
    <>
      <SectionLabel style={styles.sectionLabel}>Start from a template</SectionLabel>
      <Card padding={0} style={styles.templateCard}>
        {TEMPLATES.map((t, i) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`Add ${t.name} template`}
            onPress={() => addTemplate(t)}
            style={({ pressed }) => [
              styles.templateRow,
              i > 0 && styles.divider,
              pressed && styles.rowPressed,
            ]}
          >
            <EquipmentIcon equipment={t.equipment} size={22} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{t.name}</Text>
              <Text variant="caption" color="textSecondary" style={styles.subTight}>
                {t.meta}
              </Text>
            </View>
            <View style={styles.addBtn}>
              <Plus size={15} color={colors.textSecondary} weight="bold" />
            </View>
          </Pressable>
        ))}
      </Card>
    </>
  );

  if (FORCE_STATE === 'loading') {
    return (
      <ScreenScaffold>
        {nav}
        <SectionLabel style={styles.sectionLabel}>Your routines</SectionLabel>
        <View style={styles.skeleton} />
      </ScreenScaffold>
    );
  }

  if (FORCE_STATE === 'empty') {
    return (
      <ScreenScaffold>
        {nav}
        <Card style={styles.emptyCard}>
          <Text variant="headline">No routines yet</Text>
          <Text variant="caption" color="textSecondary" style={styles.subTight}>
            Create one from scratch or start from a template below.
          </Text>
        </Card>
        <NewRoutineRow label="Create your first routine" onPress={newRoutine} />
        {templates}
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      {nav}

      {FORCE_STATE === 'error' ? <ErrorBanner /> : null}

      <SectionLabel style={styles.sectionLabel}>Your routines</SectionLabel>
      {groups.map((group) => (
        <RoutineGroupCard key={group.id} group={group} onEditDay={editDay} onStartDay={startDay} />
      ))}

      <NewRoutineRow label="New routine" onPress={newRoutine} />

      {templates}
    </ScreenScaffold>
  );
}

/* --------------------------------- pieces --------------------------------- */

function RoutineGroupCard({
  group,
  onEditDay,
  onStartDay,
}: {
  group: RoutineGroup;
  onEditDay: (dayId: string) => void;
  onStartDay: (dayId: string) => void;
}) {
  const single = group.days.length === 1;

  return (
    <Card padding={0} style={styles.folder}>
      {!single ? (
        <View style={styles.folderHead}>
          <List size={22} color={colors.textSecondary} weight="regular" />
          <View style={styles.flex}>
            <Text variant="headline">{group.name}</Text>
            <Text variant="caption" color="textSecondary" style={styles.subTight}>
              {`${group.days.length} days · ${pluralExercises(groupExerciseCount(group))}`}
            </Text>
          </View>
        </View>
      ) : null}

      {group.days.map((day, i) => (
        <Pressable
          key={day.id}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${day.name}`}
          onPress={() => onEditDay(day.id)}
          style={({ pressed }) => [
            styles.dayRow,
            (!single || i > 0) && styles.divider,
            pressed && styles.rowPressed,
          ]}
        >
          {single ? <List size={22} color={colors.textSecondary} weight="regular" /> : null}
          <View style={styles.flex}>
            <Text variant="bodyStrong">{day.name}</Text>
            {single ? (
              <Text variant="caption" color="textSecondary" style={styles.subTight}>
                {pluralExercises(day.exercises.length)}
              </Text>
            ) : null}
          </View>
          {!single ? (
            <Text variant="caption" color="textSecondary">
              {pluralExercises(day.exercises.length)}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start ${day.name}`}
            onPress={() => onStartDay(day.id)}
            hitSlop={spacing[2]}
            style={({ pressed }) => [styles.play, pressed && { opacity: 0.6 }]}
          >
            <Play size={15} color={colors.accent} weight="fill" />
          </Pressable>
        </Pressable>
      ))}
    </Card>
  );
}

function NewRoutineRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.newRow, pressed && { opacity: 0.6 }]}
    >
      <Plus size={17} color={colors.accentText} weight="bold" />
      <Text variant="bodyStrong" color="accentText">
        {label}
      </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[1],
    paddingBottom: spacing[2],
  },
  iconBtn: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  folder: {
    overflow: 'hidden',
  },
  folderHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  divider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  subTight: {
    marginTop: spacing[1] / 2,
  },
  play: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: layout.buttonHeight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    marginTop: spacing[3],
  },
  templateCard: {
    paddingHorizontal: spacing[4],
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3] + 2,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: icon.stroke,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginTop: spacing[4],
  },
  skeleton: {
    height: 188,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
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
