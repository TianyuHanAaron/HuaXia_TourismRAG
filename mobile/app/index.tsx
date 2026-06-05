import { useState } from 'react';
import { ActivityIndicator } from '../src/components/PaperControls';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateTripsOverview } from '../src/api/queryInvalidation';
import { userQueries } from '../src/api/queryOptions';
import { OnboardingScreen } from '../src/features/onboarding/OnboardingScreen';
import { TripIntakeScreen } from '../src/features/onboarding/TripIntakeScreen';
import { TripHomeScreen } from '../src/features/trips/TripHomeScreen';
import { Screen } from '../src/components/Screen';

export default function IndexScreen() {
  const queryClient = useQueryClient();
  const [localReady, setLocalReady] = useState(false);
  const onboardingQuery = useQuery(userQueries.onboarding());

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
        void invalidateTripsOverview(queryClient);
      }}
    />
  );
}
