import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { useState } from 'react';

import { huaxiaMobileTheme } from '../src/theme/theme';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={huaxiaMobileTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#f8f3ec' },
            headerTintColor: '#1f2a33',
            headerTitleStyle: { fontWeight: '800' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'HuaXia' }} />
          <Stack.Screen name="intake" options={{ title: 'Create Trip' }} />
          <Stack.Screen name="trips/[tripId]" options={{ title: 'Trip' }} />
          <Stack.Screen name="trips/[tripId]/review" options={{ title: 'Review Trip' }} />
          <Stack.Screen name="trips/[tripId]/timeline" options={{ title: 'Timeline' }} />
          <Stack.Screen name="trips/[tripId]/tasks" options={{ title: 'Tasks' }} />
          <Stack.Screen name="trips/[tripId]/tasks/[taskId]" options={{ title: 'Task Detail' }} />
          <Stack.Screen name="trips/[tripId]/calendar" options={{ title: 'Calendar' }} />
          <Stack.Screen name="trips/[tripId]/documents" options={{ title: 'Documents' }} />
          <Stack.Screen name="trips/[tripId]/settings" options={{ title: 'Settings' }} />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
