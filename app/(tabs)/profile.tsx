import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useProfile, useUpdateUnitPreference } from '../../src/hooks/useProfile';
import { colors, layout, radius, spacing } from '../../src/theme/tokens';
import type { WeightUnit } from '../../src/utils/units';

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
];

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { setUnit, isPending } = useUpdateUnitPreference();
  const unit = profile?.unit_preference as WeightUnit | undefined;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="overline" color="accentText">
          Profile
        </Text>
        <Text variant="titleXL" color="textPrimary" style={{ marginTop: spacing[3] }}>
          Account
        </Text>

        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing[6] }}>
          Signed in as
        </Text>
        <Text variant="headline" color="textPrimary" style={{ marginTop: spacing[1] }}>
          {session?.user.email ?? '—'}
        </Text>

        <Text variant="caption" color="textTertiary" style={{ marginTop: spacing[6] }}>
          Units
        </Text>
        <View style={styles.segment}>
          {UNITS.map(({ value, label }) => {
            const selected = unit === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={isPending || !unit}
                onPress={() => setUnit(value)}
                style={[
                  styles.segmentItem,
                  {
                    backgroundColor: selected ? colors.accentSubtle : colors.surfaceRaised,
                    borderColor: selected ? colors.accentBorder : 'transparent',
                  },
                ]}
              >
                <Text variant="bodyStrong" color={selected ? 'accentText' : 'textSecondary'}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          variant="secondary"
          label="Sign out"
          onPress={signOut}
          style={{ marginTop: spacing[8] }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  segmentItem: {
    flex: 1,
    height: layout.inputHeight,
    borderRadius: radius.sm,
    borderWidth: layout.borderHairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
