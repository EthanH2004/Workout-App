import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Backspace, Check } from 'phosphor-react-native';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, elevation, icon, motion, radius, spacing } from '../../theme/tokens';
import { PLATE_INCREMENTS, type WeightUnit } from '../../utils/units';

const OFFSCREEN = Dimensions.get('window').height;
const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
] as const;

type ActiveField = 'weight' | 'reps';

interface NumberPadSheetProps {
  /** Identity of the set being edited; changing it re-seeds the fields in place. */
  setKey: string;
  initialWeight: string; // display units, '' if no ghost target
  initialReps: string;
  unit: WeightUnit;
  onSubmit: (weight: number, reps: number) => void;
  onClose: () => void;
}

/**
 * The custom logging keypad (§2.3 / §8.3) — a bottom sheet over the active
 * workout. Reanimated drives the slide; a Pan gesture swipes it down to dismiss
 * (cancelling the entry); a rigid haptic fires on Done. No OS keyboard: the
 * 3-column keypad edits the focused field, plate chips bump weight up or down,
 * and "Done" logs the current set and closes (the user picks the next set).
 */
export function NumberPadSheet({
  setKey,
  initialWeight,
  initialReps,
  unit,
  onSubmit,
  onClose,
}: NumberPadSheetProps) {
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [active, setActive] = useState<ActiveField>('weight');
  // "Fresh entry on focus": the next digit replaces the field, then digits append.
  const [armed, setArmed] = useState(true);
  // Plate chips add by default; the +/− toggle flips them to subtract.
  const [plateSubtract, setPlateSubtract] = useState(false);

  // Re-seed if the target set changes while mounted.
  useEffect(() => {
    setWeight(initialWeight);
    setReps(initialReps);
    setActive('weight');
    setArmed(true);
    setPlateSubtract(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setKey]);

  const translateY = useSharedValue(OFFSCREEN);
  const savedY = useSharedValue(OFFSCREEN);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: motion.duration.medium,
      easing: Easing.bezier(...motion.easing.standard),
    });
  }, [translateY]);

  function dismiss() {
    translateY.value = withTiming(
      OFFSCREEN,
      { duration: motion.duration.medium, easing: Easing.bezier(...motion.easing.exit) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  }

  const pan = Gesture.Pan()
    .activeOffsetY(12) // let taps + small moves reach the keypad
    .onStart(() => {
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, savedY.value + e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateY.value = withTiming(
          OFFSCREEN,
          { duration: motion.duration.medium, easing: Easing.bezier(...motion.easing.exit) },
          (finished) => {
            if (finished) runOnJS(onClose)();
          },
        );
      } else {
        translateY.value = withSpring(0, motion.spring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, OFFSCREEN], [1, 0], Extrapolation.CLAMP),
  }));

  function applyToActive(fn: (v: string) => string) {
    if (active === 'weight') setWeight(fn);
    else setReps(fn);
  }

  function handleKey(key: string) {
    Haptics.selectionAsync();
    if (key === 'backspace') {
      setArmed(false);
      applyToActive((v) => v.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (active === 'reps') return; // reps are integers
      if (armed) {
        setArmed(false);
        applyToActive(() => '0.');
        return;
      }
      applyToActive((v) => (v.includes('.') ? v : v === '' ? '0.' : v + '.'));
      return;
    }
    // Digit: replace the field on first press after focus, then append.
    if (armed) {
      setArmed(false);
      applyToActive(() => key);
      return;
    }
    applyToActive((v) => {
      const next = v === '0' ? key : v + key;
      return next.length > 6 ? v : next;
    });
  }

  function handlePlate(delta: number) {
    Haptics.selectionAsync();
    setActive('weight');
    setArmed(false);
    setWeight((v) => {
      const next = (parseFloat(v || '0') || 0) + (plateSubtract ? -delta : delta);
      return String(Math.max(0, next));
    });
  }

  function togglePlateSign() {
    Haptics.selectionAsync();
    setPlateSubtract((s) => !s);
  }

  function focus(field: ActiveField) {
    Haptics.selectionAsync();
    setActive(field);
    setArmed(true);
  }

  const weightNum = parseFloat(weight);
  const repsNum = parseInt(reps, 10);
  const valid =
    weight !== '' &&
    !Number.isNaN(weightNum) &&
    reps !== '' &&
    !Number.isNaN(repsNum) &&
    repsNum > 0;

  const plateSign = plateSubtract ? '−' : '+';
  const plates = PLATE_INCREMENTS[unit];

  function submit() {
    if (!valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    onSubmit(weightNum, repsNum);
  }

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
        />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + spacing[5] }]}
        >
          <View style={styles.grabber} />

          <View style={styles.fields}>
            <Pressable onPress={() => focus('weight')} style={styles.field}>
              <Text variant="overline" color="textSecondary" style={styles.fieldLabel}>
                Weight
              </Text>
              <View
                style={[
                  styles.fieldBox,
                  { borderBottomColor: active === 'weight' ? colors.accent : colors.surfaceHigh },
                ]}
              >
                <Text variant="displayXL">{weight || '0'}</Text>
                <Text variant="caption" color="textSecondary" style={styles.unit}>
                  {unit}
                </Text>
              </View>
            </Pressable>

            <Text variant="title" color="textTertiary" style={styles.mul}>
              ×
            </Text>

            <Pressable onPress={() => focus('reps')} style={styles.field}>
              <Text variant="overline" color="textSecondary" style={styles.fieldLabel}>
                Reps
              </Text>
              <View
                style={[
                  styles.fieldBox,
                  { borderBottomColor: active === 'reps' ? colors.accent : colors.surfaceHigh },
                ]}
              >
                <Text variant="displayXL">{reps || '0'}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.plates}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: plateSubtract }}
              accessibilityLabel={plateSubtract ? 'Plate chips subtract' : 'Plate chips add'}
              onPress={togglePlateSign}
              style={({ pressed }) => [
                styles.plate,
                styles.plateToggle,
                plateSubtract && styles.plateToggleActive,
                pressed && styles.platePressed,
              ]}
            >
              <Text
                variant="caption"
                color={plateSubtract ? 'accentText' : 'textSecondary'}
                style={styles.plateLabel}
              >
                {plateSign}
              </Text>
            </Pressable>
            {plates.map((delta) => (
              <Pressable
                key={delta}
                accessibilityRole="button"
                onPress={() => handlePlate(delta)}
                style={({ pressed }) => [styles.plate, pressed && styles.platePressed]}
              >
                <Text variant="caption" color="textSecondary" style={styles.plateLabel}>
                  {`${plateSign}${delta}`}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.keypad}>
            {KEY_ROWS.map((row, r) => (
              <View key={r} style={styles.keyRow}>
                {row.map((key) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={key === 'backspace' ? 'Delete' : key}
                    onPress={() => handleKey(key)}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                  >
                    {key === 'backspace' ? (
                      <Backspace size={icon.size.large} color={colors.textSecondary} weight="regular" />
                    ) : (
                      <Text variant="title">{key}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <Button
            label="Done"
            onPress={submit}
            disabled={!valid}
            icon={<Check size={19} color={colors.textOnAccent} weight="bold" />}
          />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: colors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceOverlay,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.topEdgeHighlight,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    ...elevation.sheetShadowUp,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.xs / 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  fields: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing[6],
    marginBottom: spacing[4],
  },
  field: {
    alignItems: 'center',
  },
  fieldLabel: {
    marginBottom: spacing[1],
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    paddingBottom: spacing[1] - 1,
  },
  unit: {
    marginLeft: spacing[1] / 2,
    marginBottom: spacing[1],
  },
  mul: {
    marginBottom: spacing[3],
  },
  plates: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  plate: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  platePressed: {
    opacity: motion.press.opacity,
  },
  plateToggle: {
    minWidth: spacing[10],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
  },
  plateToggleActive: {
    backgroundColor: colors.accentSubtle,
  },
  plateLabel: {
    fontVariant: ['tabular-nums'],
  },
  keypad: {
    gap: spacing[1] + 1,
    marginBottom: spacing[3],
  },
  keyRow: {
    flexDirection: 'row',
    gap: spacing[1] + 1,
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: radius.sm,
  },
  keyPressed: {
    backgroundColor: colors.surfaceHigh,
  },
});
