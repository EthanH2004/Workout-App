import { ActionSheetIOS, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DotsThreeVertical, List, Play, Plus } from 'phosphor-react-native';
import { Card, EquipmentIcon, ScreenScaffold, SectionLabel, Text } from '../../src/components';
import { colors, elevation, icon, layout, radius, spacing } from '../../src/theme/tokens';
import {
  adoptTemplate,
  deleteProgram,
  programExerciseCount,
  setCurrentProgram,
  TEMPLATES,
  useRoutines,
  type Program,
  type RoutineTemplate,
} from '../../src/features/routines/routinesStore';

// Preview loading / error / empty on the simulator; null = populated.
const FORCE_STATE: 'loading' | 'error' | 'empty' | null = null;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const programMeta = (p: Program) =>
  `${plural(p.days.length, 'day')} · ${plural(programExerciseCount(p), 'exercise')}`;

/** Routines tab (§2.4, program model): current program, library, and starters. */
export default function RoutinesScreen() {
  const router = useRouter();
  const { programs, currentProgramId } = useRoutines();

  const current = programs.find((p) => p.id === currentProgramId) ?? null;
  const others = programs.filter((p) => p.id !== currentProgramId);

  const newProgram = () => router.push('/routine-builder');
  const editDay = (dayId: string) => router.push({ pathname: '/routine-builder', params: { dayId } });
  const startDay = (dayId: string) => router.push({ pathname: '/workout/active', params: { dayId } });

  function adopt(t: RoutineTemplate) {
    adoptTemplate(t.id);
  }

  function confirmDelete(program: Program) {
    Alert.alert('Delete program?', `"${program.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteProgram(program.id) },
    ]);
  }

  function openMenu(program: Program, isCurrent: boolean) {
    const options = isCurrent
      ? ['Delete program', 'Cancel']
      : ['Set as current', 'Delete program', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: program.name,
        options,
        destructiveButtonIndex: isCurrent ? 0 : 1,
        cancelButtonIndex: options.length - 1,
      },
      (i) => {
        if (!isCurrent && i === 0) setCurrentProgram(program.id);
        else if (i === options.length - 2) confirmDelete(program);
      },
    );
  }

  const nav = (
    <View style={styles.nav}>
      <Text variant="title">Routines</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New program"
        onPress={newProgram}
        style={styles.iconBtn}
      >
        <Plus size={22} color={colors.textPrimary} weight="bold" />
      </Pressable>
    </View>
  );

  const starters = (
    <>
      <SectionLabel style={styles.sectionLabel}>Starter programs</SectionLabel>
      <Card padding={0} style={styles.templateCard}>
        {TEMPLATES.map((t, i) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`Adopt ${t.name}`}
            onPress={() => adopt(t)}
            style={({ pressed }) => [styles.templateRow, i > 0 && styles.divider, pressed && styles.rowPressed]}
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
        <SectionLabel style={styles.sectionLabel}>Current program</SectionLabel>
        <View style={styles.skeleton} />
      </ScreenScaffold>
    );
  }

  if (FORCE_STATE === 'empty' || programs.length === 0) {
    return (
      <ScreenScaffold>
        {nav}
        <Card style={styles.emptyCard}>
          <Text variant="headline">No programs yet</Text>
          <Text variant="caption" color="textSecondary" style={styles.subTight}>
            Adopt a starter below, or build your own from scratch.
          </Text>
        </Card>
        <NewProgramRow label="Create your first program" onPress={newProgram} />
        {starters}
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      {nav}

      {FORCE_STATE === 'error' ? <ErrorBanner /> : null}

      {current ? (
        <>
          <SectionLabel style={styles.sectionLabel}>Current program</SectionLabel>
          <Card accentBorder style={styles.currentCard}>
            <View style={styles.programHead}>
              <List size={22} color={colors.accentText} weight="regular" />
              <View style={styles.flex}>
                <View style={styles.titleRow}>
                  <Text variant="headline">{current.name}</Text>
                  <View style={styles.badge}>
                    <Text variant="overline" color="accentText">
                      Current
                    </Text>
                  </View>
                </View>
                <Text variant="caption" color="textSecondary" style={styles.subTight}>
                  {programMeta(current)}
                </Text>
              </View>
              <Overflow onPress={() => openMenu(current, true)} />
            </View>
            {current.days.map((day) => (
              <Pressable
                key={day.id}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${day.name}`}
                onPress={() => editDay(day.id)}
                style={({ pressed }) => [styles.dayRow, styles.divider, pressed && styles.rowPressed]}
              >
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{day.name}</Text>
                </View>
                <Text variant="caption" color="textSecondary">
                  {plural(day.exercises.length, 'exercise')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${day.name}`}
                  onPress={() => startDay(day.id)}
                  hitSlop={spacing[2]}
                  style={({ pressed }) => [styles.play, pressed && { opacity: 0.6 }]}
                >
                  <Play size={15} color={colors.accent} weight="fill" />
                </Pressable>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {others.length > 0 ? (
        <>
          <SectionLabel style={styles.sectionLabel}>Your programs</SectionLabel>
          {others.map((program) => (
            <Pressable
              key={program.id}
              accessibilityRole="button"
              accessibilityLabel={`${program.name} options`}
              onPress={() => openMenu(program, false)}
              style={({ pressed }) => [styles.otherCard, pressed && styles.otherCardPressed]}
            >
              <List size={22} color={colors.textSecondary} weight="regular" />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{program.name}</Text>
                <Text variant="caption" color="textSecondary" style={styles.subTight}>
                  {programMeta(program)}
                </Text>
              </View>
              <Overflow onPress={() => openMenu(program, false)} />
            </Pressable>
          ))}
        </>
      ) : null}

      <NewProgramRow label="New program" onPress={newProgram} />

      {starters}
    </ScreenScaffold>
  );
}

/* --------------------------------- pieces --------------------------------- */

function Overflow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Program options"
      onPress={onPress}
      hitSlop={spacing[2]}
      style={({ pressed }) => [styles.overflow, pressed && { opacity: 0.6 }]}
    >
      <DotsThreeVertical size={20} color={colors.textSecondary} weight="bold" />
    </Pressable>
  );
}

function NewProgramRow({ label, onPress }: { label: string; onPress: () => void }) {
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
  currentCard: {
    overflow: 'hidden',
    padding: 0,
  },
  programHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  badge: {
    backgroundColor: colors.accentSubtle,
    borderRadius: radius.xs,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2,
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
  overflow: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing[2],
  },
  otherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[4],
    marginTop: spacing[3],
    ...elevation.elev1,
  },
  otherCardPressed: {
    backgroundColor: colors.surfaceRaised,
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
    marginTop: spacing[4],
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
    height: 200,
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
