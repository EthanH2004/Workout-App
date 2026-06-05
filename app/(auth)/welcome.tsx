import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { Button } from '../../src/components/Button';
import { spacing } from '../../src/theme/tokens';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: spacing[6] }}>
        <Text variant="overline" color="accentText">
          Workout Tracker
        </Text>
        <Text variant="titleXL" color="textPrimary" style={{ marginTop: spacing[3] }}>
          Lift. Log.{'\n'}Get stronger.
        </Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing[4] }}>
          The fastest, calmest way to run your workout and watch your progress over time.
        </Text>
        <Button
          label="Get started"
          onPress={() => router.push('/sign-in')}
          style={{ marginTop: spacing[8] }}
        />
      </View>
    </Screen>
  );
}
