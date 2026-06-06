import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from '../src/components/PaperControls';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateTripsOverview } from '../src/api/queryInvalidation';
import { tripQueries, userQueries } from '../src/api/queryOptions';
import { OnboardingScreen } from '../src/features/onboarding/OnboardingScreen';
import { TripIntakeScreen } from '../src/features/onboarding/TripIntakeScreen';
import { TripHomeScreen } from '../src/features/trips/TripHomeScreen';
import { Screen } from '../src/components/Screen';
import { getV6MobileProductCopy } from '../src/features/v6/v6ProductionUi';
import { buildV6ActiveTripTabHref } from '../src/features/v6/v6NavigationShell';
import { useTripUiStore } from '../src/state/tripUiStore';
import { readSelectedTripIdFromMmkv } from '../src/storage/mmkvStorage';
import type { Trip } from '../src/types/trip';

export default function IndexScreen() {
  const queryClient = useQueryClient();
  const [localReady, setLocalReady] = useState(false);
  const language = useTripUiStore((state) => state.language);
  const v6Copy = getV6MobileProductCopy(language);
  const onboardingQuery = useQuery(userQueries.onboarding());

  if (onboardingQuery.isLoading) {
    return (
      <Screen title={v6Copy.productName} subtitle={v6Copy.loadingSubtitle}>
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
    return <ActiveTripEntryRouter />;
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

function ActiveTripEntryRouter() {
  const [persistedTripId] = useState(() => readSelectedTripIdFromMmkv());
  const language = useTripUiStore((state) => state.language);
  const selectedTripId = useTripUiStore((state) => state.selectedTripId);
  const selectedTab = useTripUiStore((state) => state.selectedTab);
  const setSelectedTripId = useTripUiStore((state) => state.setSelectedTripId);
  const v6Copy = getV6MobileProductCopy(language);
  const tripsQuery = useQuery(tripQueries.list());
  const targetTripId = useMemo(
    () =>
      chooseEntryTripId({
        trips: tripsQuery.data?.trips ?? [],
        selectedTripId,
        persistedTripId,
        canUsePersistedFallback: !tripsQuery.data,
      }),
    [persistedTripId, selectedTripId, tripsQuery.data],
  );

  useEffect(() => {
    if (persistedTripId && !selectedTripId) {
      setSelectedTripId(persistedTripId);
    }
  }, [persistedTripId, selectedTripId, setSelectedTripId]);

  useEffect(() => {
    if (!targetTripId) {
      return;
    }
    if (selectedTripId !== targetTripId) {
      setSelectedTripId(targetTripId);
    }
    router.replace(buildV6ActiveTripTabHref(targetTripId, selectedTab));
  }, [selectedTab, selectedTripId, setSelectedTripId, targetTripId]);

  if (targetTripId || tripsQuery.isLoading) {
    return (
      <Screen title={v6Copy.productName} subtitle="正在打开你的旅行指挥中心。">
        <ActivityIndicator animating />
      </Screen>
    );
  }

  return <TripHomeScreen />;
}

function chooseEntryTripId({
  trips,
  selectedTripId,
  persistedTripId,
  canUsePersistedFallback,
}: {
  trips: Trip[];
  selectedTripId: string | null;
  persistedTripId: string | null;
  canUsePersistedFallback: boolean;
}): string | null {
  const selectedCandidate =
    trips.find((trip) => trip.trip_id === selectedTripId) ??
    trips.find((trip) => trip.trip_id === persistedTripId) ??
    null;
  if (selectedCandidate) {
    return selectedCandidate.trip_id;
  }
  const activeTrip =
    trips.find((trip) => !['completed', 'archived', 'cancelled'].includes(trip.status)) ??
    null;
  if (activeTrip) {
    return activeTrip.trip_id;
  }
  if (trips[0]) {
    return trips[0].trip_id;
  }
  return canUsePersistedFallback ? persistedTripId : null;
}
