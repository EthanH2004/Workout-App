import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretRight, Play } from 'phosphor-react-native';
import {
  Button,
  Card,
  EquipmentIcon,
  ScreenScaffold,
  SectionLabel,
  StatCard,
  Text,
} from '../../src/components';
import { colors, icon, layout, radius, spacing } from '../../src/theme/tokens';
import { toDisplayInt, type WeightUnit } from '../../src/utils/units';
import { formatLongDate, formatShortDate, groupThousands } from '../../src/utils/format';
import { useUnit } from '../../src/features/settings/settingsStore';
import {
  useHome,
  type HomeReady,
  type HomeRecentSession,
  type HomeUpNext,
} from '../../src/features/home/homeData';
import type { Program, ProgramDay } from '../../src/features/routines/routinesStore';

/** Build the Home "Up next" view from the current program's next day. */
function buildUpNext(program: Program, day: ProgramDay): HomeUpNext {
  return {
    routineDayName: day.name,
    groupName: program.name,
    exerciseCount: day.exercises.length,
    totalSets: day.exercises.reduce((n, e) => n + e.targetSets, 0),
    preview: day.exercises.slice(0, 3).map((e) => ({
      name: e.name,
      equipment: e.equipment,
      targetSets: e.targetSets,
    })),
    moreNames: day.exercises.slice(3).map((e) => e.name),
  };
}

/** Home tab (§2.1): the landing after launch, one tap into today's session. */
export default function HomeScreen() {
  const { state, refetch } = useHome();
  const unit = useUnit();
  const today = new Date();

  return (
    <ScreenScaffold>
      <View style={styles.header}>
        <Text variant="caption" color="textSecondary">
          {formatLongDate(today)}
        </Text>
        <Text variant="titleXL" style={styles.hero}>
          Ready to lift
        </Text>
      </View>

      {state.status === 'loading' ? <HomeSkeleton /> : null}

      {state.status === 'error' ? <ErrorState onRetry={refetch} /> : null}

      {state.status === 'empty' ? (
        <QuickStartCard
          title="Start your first workout"
          subtitle="Adopt a program, or jump straight in."
          pickLabel="Browse programs"
        />
      ) : null}

      {state.status === 'ready' ? <HomeContent data={state.data} unit={unit} /> : null}
    </ScreenScaffold>
  );
}

/* ------------------------------ populated body ----------------------------- */

function HomeContent({ data, unit }: { data: HomeReady; unit: WeightUnit }) {
  return (
    <>
      {data.up ? (
        <UpNextCard upNext={buildUpNext(data.up.program, data.up.day)} dayId={data.up.day.id} />
      ) : (
        <QuickStartCard
          title="Start a workout"
          subtitle="Adopt a program for a guided daily plan."
          pickLabel="Browse programs"
        />
      )}

      <View style={styles.statStrip}>
        <StatCard label="Workouts · 7d" value={data.last7.workouts} style={styles.statItem} />
        <StatCard
          label="Volume · 7d"
          value={groupThousands(toDisplayInt(data.last7.volumeKg, unit))}
          unit={unit}
          style={styles.statItem}
        />
      </View>

      {data.recent.length > 0 ? <RecentList sessions={data.recent} unit={unit} /> : null}
    </>
  );
}

function UpNextCard({ upNext, dayId }: { upNext: HomeUpNext; dayId: string }) {
  const router = useRouter();
  const more =
    upNext.moreNames.length > 0
      ? `+${upNext.moreNames.length} more · ${upNext.moreNames
          .map((n) => n.toLowerCase())
          .join(', ')}`
      : null;

  return (
    <Card style={styles.upNext}>
      <SectionLabel>Up next</SectionLabel>
      <Text variant="title" style={styles.upNextTitle}>
        {upNext.routineDayName}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.upNextMeta}>
        {`${upNext.groupName} · ${upNext.exerciseCount} exercises · ${upNext.totalSets} sets`}
      </Text>

      <View style={styles.exList}>
        {upNext.preview.map((ex) => (
          <View key={ex.name} style={styles.exRow}>
            <EquipmentIcon equipment={ex.equipment} size={21} />
            <Text variant="bodyStrong" style={styles.exName} numberOfLines={1}>
              {ex.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {`${ex.targetSets} sets`}
            </Text>
          </View>
        ))}
        {more ? (
          <Text variant="caption" color="textTertiary" style={styles.more} numberOfLines={1}>
            {more}
          </Text>
        ) : null}
      </View>

      <Button
        label="Start workout"
        onPress={() => router.push({ pathname: '/workout/active', params: { dayId } })}
        icon={<Play size={18} color={colors.textOnAccent} weight="fill" />}
        style={styles.startButton}
      />
    </Card>
  );
}

/** Quick-start prompt — shown when there's no current program. */
function QuickStartCard({
  title,
  subtitle,
  pickLabel,
}: {
  title: string;
  subtitle: string;
  pickLabel: string;
}) {
  const router = useRouter();
  return (
    <Card style={styles.upNext}>
      <SectionLabel>Up next</SectionLabel>
      <Text variant="title" style={styles.upNextTitle}>
        {title}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.upNextMeta}>
        {subtitle}
      </Text>
      <Button
        label="Start workout"
        onPress={() => router.push('/workout/active')}
        icon={<Play size={18} color={colors.textOnAccent} weight="fill" />}
        style={styles.startButton}
      />
      <Button label={pickLabel} variant="tertiary" onPress={() => router.push('/routines')} />
    </Card>
  );
}

function RecentList({ sessions, unit }: { sessions: HomeRecentSession[]; unit: WeightUnit }) {
  return (
    <View style={styles.section}>
      <SectionLabel style={styles.sectionLabel}>Recent</SectionLabel>
      {sessions.map((session, i) => (
        <RecentRow key={session.id} session={session} first={i === 0} unit={unit} />
      ))}
    </View>
  );
}

function RecentRow({
  session,
  first,
  unit,
}: {
  session: HomeRecentSession;
  first: boolean;
  unit: WeightUnit;
}) {
  // The read-only session summary route isn't built yet; row is press-ready for it.
  const sub = `${formatShortDate(new Date(session.startedAt))}  ·  ${session.setsCount} sets  ·  ${groupThousands(
    toDisplayInt(session.volumeKg, unit),
  )} ${unit}`;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.recentRow,
        !first && styles.recentRowDivider,
        pressed && styles.recentRowPressed,
      ]}
    >
      <EquipmentIcon equipment={session.equipment} size={22} />
      <View style={styles.recentInfo}>
        <Text variant="bodyStrong">{session.name}</Text>
        <Text variant="caption" color="textSecondary" style={styles.recentSub}>
          {sub}
        </Text>
      </View>
      <CaretRight size={16} color={colors.textTertiary} weight="bold" />
    </Pressable>
  );
}

/* -------------------------------- non-happy -------------------------------- */

function HomeSkeleton() {
  return (
    <>
      <View style={[styles.skeleton, styles.upNext, { height: 232 }]} />
      <View style={styles.statStrip}>
        <View style={[styles.skeleton, styles.statItem, { height: 72 }]} />
        <View style={[styles.skeleton, styles.statItem, { height: 72 }]} />
      </View>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card style={styles.upNext}>
      <Text variant="title" style={styles.upNextTitle}>
        Couldn't load your dashboard
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.upNextMeta}>
        Check your connection and try again.
      </Text>
      <Button label="Retry" variant="secondary" onPress={onRetry} style={styles.startButton} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  hero: {
    marginTop: spacing[1],
  },
  upNext: {
    marginTop: spacing[3],
  },
  upNextTitle: {
    marginTop: spacing[1],
  },
  upNextMeta: {
    marginTop: spacing[1],
  },
  exList: {
    marginTop: spacing[3],
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2] + 2,
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  exName: {
    flex: 1,
  },
  more: {
    paddingTop: spacing[3],
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  startButton: {
    marginTop: spacing[4],
  },
  statStrip: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  statItem: {
    flex: 1,
  },
  section: {
    marginTop: spacing[6],
  },
  sectionLabel: {
    marginBottom: spacing[2],
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    borderRadius: radius.sm,
  },
  recentRowDivider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  recentRowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  recentInfo: {
    flex: 1,
  },
  recentSub: {
    marginTop: spacing[1] / 2,
  },
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
});
