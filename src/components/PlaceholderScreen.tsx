import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Screen } from './Screen';
import { Text } from './Text';
import { spacing } from '../theme/tokens';

interface PlaceholderScreenProps {
  title: string;
  /** Optional action area (e.g. the Close button on the active-workout modal). */
  footer?: ReactNode;
}

/**
 * Blank M0 screen. Shows the accent overline, the screen name in the Expanded
 * hero font, and a caption — enough to verify fonts + accent render on device.
 * Real screen content arrives in later milestones.
 */
export function PlaceholderScreen({ title, footer }: PlaceholderScreenProps) {
  return (
    <Screen center>
      <Text variant="overline" color="accentText">
        Workout Tracker
      </Text>
      <Text variant="titleXL" color="textPrimary" style={{ marginTop: spacing[3] }}>
        {title}
      </Text>
      <Text variant="caption" color="textTertiary" style={{ marginTop: spacing[2] }}>
        Milestone M0 — skeleton
      </Text>
      {footer ? <View style={{ marginTop: spacing[8] }}>{footer}</View> : null}
    </Screen>
  );
}
