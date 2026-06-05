import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';

/** Four tabs (Home · Routines · Progress · Profile) with the custom tab bar. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="routines" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
