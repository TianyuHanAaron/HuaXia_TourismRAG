import { MaterialIcons } from '@expo/vector-icons';
import { router, Tabs, useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import {
  buildV6ActiveTripTabHref,
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
  bottom: 0,
  elevation: 16,
  left: 0,
  minHeight: 64,
  paddingBottom: 6,
  paddingTop: 6,
  position: 'absolute' as const,
  right: 0,
  zIndex: 20,
};

export default function ActiveTripTabsLayout() {
  const { tripId } = useLocalSearchParams<{ tripId?: string | string[] }>();
  const pathname = usePathname();
  const language = useTripUiStore((state) => state.language);
  const selectedTripId = useTripUiStore((state) => state.selectedTripId);
  const selectedTab = useTripUiStore((state) => state.selectedTab);
  const setSelectedTab = useTripUiStore((state) => state.setSelectedTab);
  const selectedRouteName = getV6ActiveTripTabRouteName(selectedTab);
  const routeTab = getV6ActiveTripTabFromPath(pathname);
  const activeTripId = normalizeTripIdParam(tripId) ?? selectedTripId;

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
            tabBarAccessibilityLabel: `${getV6ActiveTripTabLabel(tab.id, language)} · ${tab.question[language]} · ${getV6ActiveTripTabLabel(tab.id, 'en')}`,
            tabBarButton: (props) => (
              <Pressable
                accessibilityLabel={`${getV6ActiveTripTabLabel(tab.id, language)} · ${tab.question[language]} · ${getV6ActiveTripTabLabel(tab.id, 'en')}`}
                accessibilityRole="tab"
                accessibilityState={props.accessibilityState}
                onLongPress={props.onLongPress}
                onPress={(event) => {
                  props.onPress?.(event);
                  setSelectedTab(tab.id);
                  if (activeTripId) {
                    router.replace(buildV6ActiveTripTabHref(activeTripId, tab.id));
                  }
                }}
                style={props.style}
                testID={`v6-tab-${tab.id}`}
              >
                {props.children}
              </Pressable>
            ),
            tabBarButtonTestID: `v6-tab-${tab.id}`,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name={tab.iconName} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

function normalizeTripIdParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
