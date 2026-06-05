import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { colors, layout, motion, radius } from '../theme/tokens';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// Control geometry from the design (§ settings mockup): a 46×28 track with a 22px
// knob inset 3px — values intrinsic to this control, not theme-scale spacing.
const TRACK_W = 46;
const TRACK_H = 28;
const KNOB = 22;
const INSET = 3;
const TRAVEL = TRACK_W - KNOB - INSET * 2;

/**
 * iOS-style switch (settings mockup): track is `surfaceHigh` when off, `accent`
 * when on, with a white knob that slides on `fast` motion. 44pt tap area via hitSlop.
 */
export function Toggle({ value, onValueChange, disabled = false }: ToggleProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: motion.duration.fast,
      useNativeDriver: false, // animating backgroundColor
    }).start();
  }, [value, progress]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceHigh, colors.accent],
  });
  const knobX = progress.interpolate({ inputRange: [0, 1], outputRange: [INSET, INSET + TRAVEL] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={{ top: layout.minTapTarget - TRACK_H }}
      onPress={() => onValueChange(!value)}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      <Animated.View
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: radius.full,
          backgroundColor: trackColor,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: KNOB,
            height: KNOB,
            borderRadius: radius.full,
            backgroundColor: colors.textPrimary,
            transform: [{ translateX: knobX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
