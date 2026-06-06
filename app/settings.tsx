import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { PRIVACY_URL, TERMS_URL } from '../src/config/links';
import {
  Card,
  ScreenScaffold,
  SectionLabel,
  SegmentedControl,
  Text,
  Toggle,
} from '../src/components';
import type { ColorToken } from '../src/theme/tokens';
import { colors, icon, layout, radius, spacing } from '../src/theme/tokens';
import type { WeightUnit } from '../src/utils/units';
import { useAuth } from '../src/features/auth/AuthProvider';
import { useExportData } from '../src/features/profile/profileData';
import { deleteAccount } from '../src/lib/supabase/queries';
import { queryClient } from '../src/lib/offline/queryClient';
import {
  setRestReminder,
  setSyncEnabled,
  setUnit,
  useSettings,
} from '../src/features/settings/settingsStore';

const UNIT_OPTIONS: { label: string; value: WeightUnit }[] = [
  { label: 'lb', value: 'lb' },
  { label: 'kg', value: 'kg' },
];

// Mock sync status for the Status row; real status comes from the offline queue.
type SyncState = 'synced' | 'syncing' | 'offline' | 'error';
const SYNC_STATE: SyncState = 'synced';
const SYNC_DISPLAY: Record<SyncState, { dot: ColorToken; text: string }> = {
  synced: { dot: 'success', text: 'Synced · just now' },
  syncing: { dot: 'accent', text: 'Syncing…' },
  offline: { dot: 'textTertiary', text: 'Offline · last synced 2h ago' },
  error: { dot: 'warning', text: "Couldn't sync" },
};

function openExternal(url: string) {
  Linking.openURL(url).catch(() => Alert.alert("Couldn't open link", 'Please try again later.'));
}

/** Settings (§2.10): preferences (units!), sync, account, about. No tab bar. */
export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const settings = useSettings();
  const { exportData } = useExportData();

  const email = session?.user.email ?? '—';
  const provider = session?.user.app_metadata?.provider === 'apple' ? 'Apple' : 'Email';

  // Truly deletes the account + all data server-side (delete_user RPC), then
  // clears the local session so the auth gate returns to Welcome.
  async function runDelete() {
    try {
      await deleteAccount();
      queryClient.clear(); // wipe the locally-cached copy of the now-deleted data
      await signOut().catch(() => {}); // user is gone; ignore any revoke error
    } catch {
      Alert.alert("Couldn't delete account", 'Please try again or contact support.');
    }
  }

  // Two-step + type-to-confirm (Apple Guideline 5.1.1): irreversible, so guard it.
  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all workout data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.prompt(
              'Type DELETE to confirm',
              'This removes your account and every workout, program, and record. There is no undo.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: (text?: string) => {
                    if ((text ?? '').trim().toUpperCase() === 'DELETE') runDelete();
                    else Alert.alert('Not deleted', 'Type DELETE to confirm account deletion.');
                  },
                },
              ],
              'plain-text',
            ),
        },
      ],
    );
  }

  const status = settings.syncEnabled ? SYNC_DISPLAY[SYNC_STATE] : null;

  const header = (
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.navIcon}>
        <CaretLeft size={icon.size.standard} color={colors.textPrimary} weight="bold" />
      </Pressable>
      <Text variant="headline">Settings</Text>
      <View style={styles.navIcon} />
    </View>
  );

  return (
    <ScreenScaffold header={header}>
      <SectionLabel style={styles.groupLabel}>Preferences</SectionLabel>
      <Card padding={0} style={styles.group}>
        <Row label="Units" first>
          <SegmentedControl
            options={UNIT_OPTIONS}
            value={settings.unit}
            onChange={setUnit}
            style={styles.units}
          />
        </Row>
        <Row label="Default rest reminder">
          <Toggle value={settings.restReminder} onValueChange={setRestReminder} />
        </Row>
        <Row label="Appearance">
          <Text variant="bodyStrong" color="textSecondary">
            Dark
          </Text>
        </Row>
      </Card>

      <SectionLabel style={styles.groupLabel}>Data &amp; sync</SectionLabel>
      <Card padding={0} style={styles.group}>
        <Row label="Supabase sync" first>
          <Toggle value={settings.syncEnabled} onValueChange={setSyncEnabled} />
        </Row>
        <Row label="Status">
          {status ? (
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors[status.dot] }]} />
              <Text variant="caption" color="textSecondary">
                {status.text}
              </Text>
            </View>
          ) : (
            <Text variant="bodyStrong" color="textSecondary">
              Off
            </Text>
          )}
        </Row>
        <NavRow label="Export workout data" onPress={exportData} />
      </Card>

      <SectionLabel style={styles.groupLabel}>Account</SectionLabel>
      <Card padding={0} style={styles.group}>
        <Row label="Email" first>
          <Text variant="bodyStrong" color="textSecondary" numberOfLines={1}>
            {email}
          </Text>
        </Row>
        <Row label="Signed in with">
          <Text variant="bodyStrong" color="textSecondary">
            {provider}
          </Text>
        </Row>
      </Card>

      <SectionLabel style={styles.groupLabel}>About</SectionLabel>
      <Card padding={0} style={styles.group}>
        <NavRow label="Privacy policy" first onPress={() => openExternal(PRIVACY_URL)} />
        <NavRow label="Terms of service" onPress={() => openExternal(TERMS_URL)} />
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={confirmDelete}
        style={({ pressed }) => [styles.delete, pressed && { opacity: 0.6 }]}
      >
        <Text variant="bodyStrong" color="destructive">
          Delete account
        </Text>
      </Pressable>
      <Text variant="caption" color="textTertiary" style={styles.version}>
        Version 1.0.0
      </Text>
    </ScreenScaffold>
  );
}

/* --------------------------------- rows ----------------------------------- */

function Row({ label, children, first }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <View style={[styles.row, !first && styles.divider]}>
      <Text variant="bodyStrong" color="textPrimary" style={styles.flex}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function NavRow({ label, onPress, first }: { label: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.rowPressed]}
    >
      <Text variant="bodyStrong" color="textPrimary" style={styles.flex}>
        {label}
      </Text>
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
    paddingVertical: spacing[1],
  },
  navIcon: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    marginTop: spacing[5],
    marginBottom: spacing[2],
  },
  group: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3] + 2,
    paddingHorizontal: spacing[4],
    minHeight: layout.listRowHeight,
  },
  divider: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  units: {
    width: 132,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: spacing[5],
    marginTop: spacing[4],
  },
  version: {
    textAlign: 'center',
    marginTop: spacing[1],
  },
});
