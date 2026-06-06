import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { TamaguiProvider } from 'tamagui';
import { useEffect, useState } from 'react';

import { createMobileQueryClient } from '../src/api/queryClient';
import {
  readTripUiPreferencesFromMmkv,
  writeTripUiPreferencesToMmkv,
} from '../src/storage/mmkvStorage';
import { useTripUiStore } from '../src/state/tripUiStore';
import { huaxiaMobileTheme } from '../src/theme/theme';
import tamaguiConfig, { huaxiaColorTokens } from '../tamagui.config';

export default function RootLayout() {
  const [queryClient] = useState(() => createMobileQueryClient());
  const [uiPreferencesHydrated, setUiPreferencesHydrated] = useState(false);

  useEffect(() => {
    const preferences = readTripUiPreferencesFromMmkv();
    if (preferences) {
      useTripUiStore.setState({
        language: preferences.language,
        displayDensity: preferences.displayDensity,
        onboardingStage: preferences.onboardingStage,
        selectedTab: preferences.selectedTab,
        taskGroupVisibility: preferences.taskGroupVisibility,
      });
    }
    setUiPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiPreferencesHydrated) {
      return undefined;
    }
    return useTripUiStore.subscribe((state) => {
      writeTripUiPreferencesToMmkv({
        language: state.language,
        displayDensity: state.displayDensity,
        onboardingStage: state.onboardingStage,
        selectedTab: state.selectedTab,
        taskGroupVisibility: state.taskGroupVisibility,
      });
    });
  }, [uiPreferencesHydrated]);

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="huaxiaLight">
        <PaperProvider theme={huaxiaMobileTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: huaxiaColorTokens.paper },
              headerTintColor: huaxiaColorTokens.ink,
              headerTitleStyle: { fontWeight: '800' },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'HuaXia' }} />
            <Stack.Screen name="intake" options={{ title: 'Create Trip' }} />
            <Stack.Screen name="trips/[tripId]" options={{ title: 'Trip' }} />
            <Stack.Screen name="trips/[tripId]/(tabs)" options={{ title: 'Trip', headerShown: false }} />
            <Stack.Screen name="trips/[tripId]/review" options={{ title: 'Review Trip' }} />
            <Stack.Screen name="trips/[tripId]/timeline" options={{ title: 'Timeline' }} />
            <Stack.Screen name="trips/[tripId]/tasks" options={{ title: 'Tasks' }} />
            <Stack.Screen name="trips/[tripId]/tasks/[taskId]" options={{ title: 'Task Detail' }} />
            <Stack.Screen name="trips/[tripId]/calendar" options={{ title: 'Calendar' }} />
            <Stack.Screen name="trips/[tripId]/documents" options={{ title: 'Documents' }} />
            <Stack.Screen name="trips/[tripId]/settings" options={{ title: 'Settings' }} />
            <Stack.Screen
              name="trips/[tripId]/modals/provider-actions/[actionId]"
              options={{ title: 'Provider Action', presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/modals/documents/attach"
              options={{ title: 'Attach Document', presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/modals/calendar/export"
              options={{ title: 'Calendar Export', presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/modals/tasks/[taskId]/edit"
              options={{ title: 'Edit Task', presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/modals/sync/conflict"
              options={{ title: 'Sync Conflict', presentation: 'modal' }}
            />
            <Stack.Screen
              name="trips/[tripId]/modals/reminders/settings"
              options={{ title: 'Reminder Settings', presentation: 'modal' }}
            />
          </Stack>
        </PaperProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
