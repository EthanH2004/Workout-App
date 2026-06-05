import { View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { spacing } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
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
