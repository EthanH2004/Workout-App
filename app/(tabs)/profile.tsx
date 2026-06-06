import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretRight, DownloadSimple, Gear, Medal, Question } from 'phosphor-react-native';
import { SUPPORT_EMAIL } from '../../src/config/links';
import { Card, ScreenScaffold, SectionLabel, StatCard, Text } from '../../src/components';
import { colors, layout, radius, spacing } from '../../src/theme/tokens';
import { toDisplayInt } from '../../src/utils/units';
import { formatCompact, formatMonthYear, groupThousands } from '../../src/utils/format';
import { useUnit } from '../../src/features/settings/settingsStore';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useProfile } from '../../src/hooks/useProfile';
import {
  useExportData,
  useLifetimeStats,
  type PrRecord,
} from '../../src/features/profile/profileData';

const ZERO_STATS = { workouts: 0, totalVolumeKg: 0, totalSets: 0, prs: 0 };
const PR_LIMIT = 8; // top lifts on the Profile; full history lives in Progress

const isAppleRelay = (email: string) => email.includes('privaterelay.appleid.com');

function deriveName(email: string): string {
  if (!email || email === '—' || isAppleRelay(email)) return 'Lifter';
  const first = email.split('@')[0].split(/[._-]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function emailSupport() {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Workout Tracker feedback')}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('No mail app', `Reach us at ${SUPPORT_EMAIL}.`),
  );
}

/** Profile tab (§2.9): identity, lifetime stats, personal records, account. */
export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const unit = useUnit();
  const { state, refetch } = useLifetimeStats();
  const { exportData } = useExportData();

  const rawEmail = session?.user.email ?? '—';
  const displayEmail = isAppleRelay(rawEmail) ? 'Apple ID' : rawEmail;
  const name = profile?.display_name || deriveName(rawEmail);
  const createdAt = profile?.created_at ?? session?.user.created_at;
  const since = createdAt ? formatMonthYear(new Date(createdAt)) : null;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const nav = (
    <View style={styles.nav}>
      <Text variant="title">Profile</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => router.push('/settings')}
        style={styles.gear}
      >
        <Gear size={21} color={colors.textPrimary} weight="regular" />
      </Pressable>
    </View>
  );

  if (state.status === 'loading') {
    return (
      <ScreenScaffold>
        {nav}
        <View style={[styles.skeleton, { height: 60, borderRadius: radius.full, width: 60, marginTop: spacing[2] }]} />
        <View style={styles.statGrid}>
          <View style={[styles.skeleton, styles.statItem, { height: 78 }]} />
          <View style={[styles.skeleton, styles.statItem, { height: 78 }]} />
        </View>
        <View style={styles.statGrid}>
          <View style={[styles.skeleton, styles.statItem, { height: 78 }]} />
          <View style={[styles.skeleton, styles.statItem, { height: 78 }]} />
        </View>
      </ScreenScaffold>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenScaffold>
        {nav}
        <View style={styles.errorBlock}>
          <Text variant="body" color="textSecondary" style={styles.errorText}>
            Couldn't load your profile.
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

  const isEmpty = state.status === 'empty';
  const stats = isEmpty ? ZERO_STATS : state.stats;
  const prs = isEmpty ? [] : state.prs.slice(0, PR_LIMIT);

  return (
    <ScreenScaffold>
      {nav}

      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text variant="numEmphasis" color="accentText">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="title">{name}</Text>
          <Text variant="caption" color="textSecondary" style={styles.identSub} numberOfLines={1}>
            {since ? `${displayEmail} · since ${since}` : displayEmail}
          </Text>
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatCard label="Workouts" value={stats.workouts} style={styles.statItem} />
        <StatCard
          label="Total volume"
          value={formatCompact(toDisplayInt(stats.totalVolumeKg, unit))}
          unit={unit}
          style={styles.statItem}
        />
      </View>
      <View style={styles.statGrid}>
        <StatCard label="Personal records" value={stats.prs} style={styles.statItem} />
        <StatCard label="Total sets" value={stats.totalSets} style={styles.statItem} />
      </View>

      {isEmpty ? (
        <Text variant="caption" color="textSecondary" style={styles.nudge}>
          Log your first workout to start building your stats.
        </Text>
      ) : null}

      {prs.length > 0 ? (
        <>
          <SectionLabel style={styles.groupLabel}>Personal records</SectionLabel>
          <Card padding={0} style={styles.group}>
            {prs.map((pr, i) => (
              <PrRow
                key={pr.id}
                pr={pr}
                unit={unit}
                first={i === 0}
                onPress={() => router.push({ pathname: '/exercise-detail', params: { id: pr.id } })}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel style={styles.groupLabel}>Account</SectionLabel>
      <Card padding={0} style={styles.group}>
        <ProfileRow
          icon={<Gear size={20} color={colors.textSecondary} weight="regular" />}
          label="Settings"
          first
          onPress={() => router.push('/settings')}
        />
        <ProfileRow
          icon={<DownloadSimple size={20} color={colors.textSecondary} weight="regular" />}
          label="Export data"
          onPress={exportData}
        />
        <ProfileRow
          icon={<Question size={20} color={colors.textSecondary} weight="regular" />}
          label="Help & feedback"
          onPress={emailSupport}
        />
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.6 }]}
      >
        <Text variant="bodyStrong" color="destructive">
          Sign out
        </Text>
      </Pressable>
    </ScreenScaffold>
  );
}

/** A personal-record row: exercise + best estimated 1RM in the violet PR color. */
function PrRow({
  pr,
  unit,
  first,
  onPress,
}: {
  pr: PrRecord;
  unit: ReturnType<typeof useUnit>;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pr.name} record`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.rowPressed]}
    >
      <Medal size={20} color={colors.textSecondary} weight="regular" />
      <Text variant="bodyStrong" color="textPrimary" style={styles.flex} numberOfLines={1}>
        {pr.name}
      </Text>
      <Text variant="bodyStrong" color="pr">
        {`${groupThousands(toDisplayInt(pr.e1rmKg, unit))} ${unit}`}
      </Text>
      <CaretRight size={16} color={colors.textTertiary} weight="bold" />
    </Pressable>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  onPress,
  first,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  first?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.rowPressed]}
    >
      {icon}
      <Text variant="bodyStrong" color="textPrimary" style={styles.flex}>
        {label}
      </Text>
      {value ? (
        <Text variant="caption" color="textSecondary">
          {value}
        </Text>
      ) : null}
      <CaretRight size={16} color={colors.textTertiary} weight="bold" />
    </Pressable>
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
  gear: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4] - 2,
    paddingTop: spacing[2],
    paddingBottom: spacing[5],
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identSub: {
    marginTop: spacing[1] / 2,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  statItem: {
    flex: 1,
  },
  nudge: {
    marginTop: spacing[3],
    textAlign: 'center',
  },
  groupLabel: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4] - 1,
    paddingHorizontal: spacing[4],
  },
  divider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: spacing[5],
    marginTop: spacing[3],
  },
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  errorBlock: {
    marginTop: spacing[8],
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing[3],
  },
});
