import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';

import {
  getV6ActiveTripTabFromPath,
  getV6ActiveTripTabLabel,
  getV6ActiveTripTabRouteName,
  v6ActiveTripTabs,
} from '../../../../src/features/v6/v6NavigationShell';
import { useTripUiStore } from '../../../../src/state/tripUiStore';
import {
  huaxiaColorTokens,
  huaxiaTypographyTokens,
  huaxiaTypographyWeightTokens,
} from '../../../../tamagui.config';

const tabBarStyle = {
  backgroundColor: huaxiaColorTokens.surface,
  borderTopColor: huaxiaColorTokens.border,
  minHeight: 64,
  paddingBottom: 6,
  paddingTop: 6,
};

export default function ActiveTripTabsLayout() {
  const pathname = usePathname();
  const language = useTripUiStore((state) => state.language);
  const selectedTab = useTripUiStore((state) => state.selectedTab);
  const setSelectedTab = useTripUiStore((state) => state.setSelectedTab);
  const selectedRouteName = getV6ActiveTripTabRouteName(selectedTab);
  const routeTab = getV6ActiveTripTabFromPath(pathname);

  useEffect(() => {
    if (selectedTab !== routeTab) {
      setSelectedTab(routeTab);
    }
  }, [routeTab, selectedTab, setSelectedTab]);

  return (
    <Tabs
      initialRouteName={selectedRouteName}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: huaxiaColorTokens.primaryPressed,
        tabBarInactiveTintColor: huaxiaColorTokens.mutedInk,
        tabBarLabelStyle: {
          fontSize: huaxiaTypographyTokens.metadata,
          fontWeight: huaxiaTypographyWeightTokens.button,
          lineHeight: huaxiaTypographyTokens.metadataLine,
        },
        tabBarStyle,
      }}
    >
      {v6ActiveTripTabs.map((tab) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.routeName}
          listeners={{
            focus: () => setSelectedTab(tab.id),
          }}
          options={{
            title: getV6ActiveTripTabLabel(tab.id, language),
            tabBarAccessibilityLabel: `${getV6ActiveTripTabLabel(tab.id, language)} · ${tab.question[language]}`,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name={tab.iconName} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
