import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, layout, motion, radius, spacing, type ColorToken } from '../theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Optional leading glyph (e.g. a Play icon). Caller sets its color per variant. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const FILL: Record<Variant, string> = {
  primary: colors.accent,
  secondary: colors.surfaceRaised,
  tertiary: 'transparent',
  destructive: 'transparent',
};

const PRESSED_FILL: Record<Variant, string> = {
  primary: colors.accentPressed,
  secondary: colors.surfaceHigh,
  tertiary: colors.surfaceRaised,
  destructive: colors.surfaceRaised,
};

const LABEL_COLOR: Record<Variant, ColorToken> = {
  primary: 'textOnAccent',
  secondary: 'textPrimary',
  tertiary: 'accentText',
  destructive: 'destructive',
};

/** Hierarchy: orange primary → gray secondary → text tertiary → red destructive (§8.1). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed && !isDisabled ? PRESSED_FILL[variant] : FILL[variant] },
        pressed && !isDisabled ? { transform: [{ scale: motion.press.scale }] } : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textOnAccent : colors.textPrimary}
        />
      ) : (
        <>
          {icon}
          <Text variant="bodyStrong" color={LABEL_COLOR[variant]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: layout.buttonHeight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  disabled: {
    opacity: 0.5,
  },
});
