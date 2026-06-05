import { Tabs } from 'expo-router';

import { huaxiaColorTokens } from '../../../../tamagui.config';

const tabBarStyle = {
  backgroundColor: huaxiaColorTokens.surface,
  borderTopColor: huaxiaColorTokens.border,
};

export default function ActiveTripTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: huaxiaColorTokens.primaryPressed,
        tabBarInactiveTintColor: huaxiaColorTokens.mutedInk,
        tabBarLabelStyle: { fontWeight: '700' },
        tabBarStyle,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="timeline" options={{ title: 'Timeline' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
