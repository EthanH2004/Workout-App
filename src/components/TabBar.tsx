import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChartLineUp, House, ListBullets, Plus, User } from 'phosphor-react-native';
import { colors, elevation, icon, layout, motion, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

type TabName = 'home' | 'routines' | 'progress' | 'profile';

const TAB_CONFIG: Record<TabName, { label: string; Icon: typeof House }> = {
  home: { label: 'Home', Icon: House },
  routines: { label: 'Routines', Icon: ListBullets },
  progress: { label: 'Progress', Icon: ChartLineUp },
  profile: { label: 'Profile', Icon: User },
};

// Render order in the bar; the raised Start FAB is injected between the two halves.
const LEFT: TabName[] = ['home', 'routines'];
const RIGHT: TabName[] = ['progress', 'profile'];

interface TabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
}

/**
 * Custom tab bar (§8.7): translucent blurred surface with a top hairline, four
 * labeled tabs (active = filled accent icon + accent label), and a raised center
 * Start FAB that opens the active-workout flow.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function renderTab(name: TabName) {
    const routeIndex = state.routes.findIndex((r) => r.name === name);
    const route = state.routes[routeIndex];
    if (!route) return null;
    const focused = state.index === routeIndex;
    const { label, Icon } = TAB_CONFIG[name];
    const colorToken = focused ? 'accent' : 'tabInactive';

    return (
      <Pressable
        key={name}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.tab}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(name);
          }
        }}
      >
        <Icon
          size={icon.size.standard}
          color={colors[colorToken]}
          weight={focused ? 'fill' : 'regular'}
        />
        <Text variant="tabLabel" color={colorToken} style={styles.label}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.fill, { paddingBottom: insets.bottom }]}>
        <View style={styles.row}>
          {LEFT.map(renderTab)}

          <View style={styles.fabSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start workout"
              onPress={() => router.push('/workout/active')}
              style={({ pressed }) => [
                styles.fabPress,
                pressed && {
                  opacity: motion.press.opacity,
                  transform: [{ scale: motion.press.scale }],
                },
              ]}
            >
              <View style={styles.fab}>
                <Plus size={icon.size.fab} color={colors.textOnAccent} weight="bold" />
              </View>
              <Text variant="tabLabel" color="accent" style={styles.label}>
                Start
              </Text>
            </Pressable>
          </View>

          {RIGHT.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: layout.borderHairline,
    borderTopColor: colors.borderSubtle,
    // the FAB pokes above the bar, so it must not be clipped
    overflow: 'visible',
  },
  fill: {
    paddingTop: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.tabBarBackground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: layout.tabBarHeight,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing[1],
    minHeight: layout.minTapTarget,
  },
  label: {
    marginTop: spacing[1],
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
  },
  fabPress: {
    alignItems: 'center',
    marginTop: -layout.fabRaise,
  },
  fab: {
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.fabShadow,
  },
});
