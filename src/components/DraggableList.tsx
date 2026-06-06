import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, elevation, motion, radius, spacing } from '../theme/tokens';

type PanGesture = ReturnType<typeof Gesture.Pan>;

interface DraggableListProps<T> {
  items: T[];
  keyForItem: (item: T) => string;
  /** Inner card content. `drag` is the handle gesture (undefined until measured). */
  renderContent: (item: T, drag: PanGesture | undefined) => ReactNode;
  onReorder: (orderedKeys: string[]) => void;
  /** Vertical gap between cards. */
  rowGap?: number;
}

const listToObject = (keys: string[]): Record<string, number> =>
  keys.reduce<Record<string, number>>((acc, k, i) => {
    acc[k] = i;
    return acc;
  }, {});

function objectMove(obj: Record<string, number>, from: number, to: number) {
  'worklet';
  const next: Record<string, number> = {};
  for (const id in obj) {
    if (obj[id] === from) next[id] = to;
    else if (obj[id] === to) next[id] = from;
    else next[id] = obj[id];
  }
  return next;
}

function orderFromPositions(positions: Record<string, number>) {
  'worklet';
  return Object.keys(positions).sort((a, b) => positions[a] - positions[b]);
}

/**
 * Generic long-press drag-to-reorder list (Reanimated + gesture-handler). Each
 * item renders as a surface card; long-pressing the handle lifts it (e2 + scale)
 * and the list reflows. Card height is measured from the first item, so names
 * should stay single-line for uniform rows. Used by the Program editor (days)
 * and the Day editor (exercises).
 */
export function DraggableList<T>({
  items,
  keyForItem,
  renderContent,
  onReorder,
  rowGap = spacing[3],
}: DraggableListProps<T>) {
  const [rowHeight, setRowHeight] = useState(0);
  const keys = items.map(keyForItem);
  const positions = useSharedValue(listToObject(keys));

  useEffect(() => {
    positions.value = listToObject(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join('|')]);

  function measure(e: LayoutChangeEvent) {
    if (rowHeight === 0) setRowHeight(e.nativeEvent.layout.height + rowGap);
  }

  if (rowHeight === 0) {
    return (
      <View>
        {items.map((item, i) => (
          <View
            key={keyForItem(item)}
            onLayout={i === 0 ? measure : undefined}
            style={[styles.card, { marginBottom: rowGap }]}
          >
            {renderContent(item, undefined)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ height: items.length * rowHeight }}>
      {items.map((item) => (
        <DragItem
          key={keyForItem(item)}
          itemKey={keyForItem(item)}
          count={items.length}
          rowHeight={rowHeight}
          positions={positions}
          onReorder={onReorder}
        >
          {(drag) => renderContent(item, drag)}
        </DragItem>
      ))}
    </View>
  );
}

function DragItem({
  itemKey,
  count,
  rowHeight,
  positions,
  onReorder,
  children,
}: {
  itemKey: string;
  count: number;
  rowHeight: number;
  positions: SharedValue<Record<string, number>>;
  onReorder: (keys: string[]) => void;
  children: (drag: PanGesture) => ReactNode;
}) {
  const top = useSharedValue((positions.value[itemKey] ?? 0) * rowHeight);
  const startTop = useSharedValue(0);
  const active = useSharedValue(false);

  useAnimatedReaction(
    () => positions.value[itemKey],
    (cur, prev) => {
      if (cur !== undefined && cur !== prev && !active.value) {
        top.value = withSpring(cur * rowHeight, motion.spring);
      }
    },
  );

  const drag = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.value = true;
      startTop.value = top.value;
    })
    .onUpdate((e) => {
      top.value = startTop.value + e.translationY;
      const newIndex = Math.min(Math.max(Math.round(top.value / rowHeight), 0), count - 1);
      const curIndex = positions.value[itemKey];
      if (newIndex !== curIndex) {
        positions.value = objectMove(positions.value, curIndex, newIndex);
      }
    })
    .onEnd(() => {
      top.value = withSpring((positions.value[itemKey] ?? 0) * rowHeight, motion.spring);
    })
    .onFinalize(() => {
      if (!active.value) return;
      active.value = false;
      runOnJS(onReorder)(orderFromPositions(positions.value));
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: top.value,
    zIndex: active.value ? 10 : 1,
    transform: [{ scale: withSpring(active.value ? 1.03 : 1, motion.spring) }],
    shadowOpacity: active.value ? elevation.elev2.shadowOpacity : elevation.elev1.shadowOpacity,
    shadowRadius: active.value ? elevation.elev2.shadowRadius : elevation.elev1.shadowRadius,
    elevation: active.value ? 12 : 8,
  }));

  return <Animated.View style={[styles.card, style]}>{children(drag)}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
  },
});
