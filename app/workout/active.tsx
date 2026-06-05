import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';
import { Text } from '../../src/components/Text';
import { colors, layout, radius, spacing } from '../../src/theme/tokens';

/** Blank full-screen active session (opened by the Start FAB). */
export default function ActiveWorkoutScreen() {
  const router = useRouter();
  return (
    <PlaceholderScreen
      title="Active Workout"
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            height: layout.minTapTarget,
            paddingHorizontal: spacing[6],
            borderRadius: radius.sm,
            backgroundColor: colors.surfaceRaised,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text variant="bodyStrong" color="textPrimary">
            Close
          </Text>
        </Pressable>
      }
    />
  );
}
