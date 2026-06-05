import { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { colors, layout, radius, spacing, typography } from '../theme/tokens';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
}

/** Text input (§8.2): surfaceRaised fill, hairline border, accent focus ring. */
export function Input({ label, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? (
        <Text variant="overline" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { borderColor: focused ? colors.accentBorder : colors.borderDefault },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing[2],
  },
  input: {
    height: layout.inputHeight,
    backgroundColor: colors.surfaceRaised,
    borderWidth: layout.borderHairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
});
