import { useState } from 'react';
import { ActivityIndicator } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getOnboardingState } from '../src/api/user';
import { OnboardingScreen } from '../src/features/onboarding/OnboardingScreen';
import { TripIntakeScreen } from '../src/features/onboarding/TripIntakeScreen';
import { TripHomeScreen } from '../src/features/trips/TripHomeScreen';
import { Screen } from '../src/components/Screen';

export default function IndexScreen() {
  const queryClient = useQueryClient();
  const [localReady, setLocalReady] = useState(false);
  const onboardingQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: getOnboardingState,
  });

  if (onboardingQuery.isLoading) {
    return (
      <Screen title="华夏旅行指挥中心" subtitle="正在读取首次使用状态。">
        <ActivityIndicator animating />
      </Screen>
    );
  }

  const onboarding = onboardingQuery.data;
  const shouldShowHome =
    localReady ||
    onboarding?.recommended_next_step === 'open_trip_home' ||
    onboarding?.recommended_next_step === 'open_sample_command_center';

  if (shouldShowHome) {
    return <TripHomeScreen />;
  }
  if (onboarding?.recommended_next_step === 'open_trip_intake') {
    return <TripIntakeScreen />;
  }

  return (
    <OnboardingScreen
      onReady={() => {
        setLocalReady(true);
        void queryClient.invalidateQueries({ queryKey: ['trips'] });
        void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      }}
    />
  );
}
