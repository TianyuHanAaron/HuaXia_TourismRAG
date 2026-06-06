import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from './queryKeys';

export async function invalidateTripsOverview(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.trips }),
    queryClient.invalidateQueries({ queryKey: queryKeys.onboarding }),
  ]);
}

export async function invalidateTripServerState(
  queryClient: QueryClient,
  tripId: string | null | undefined,
): Promise<void> {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: queryKeys.trips }),
    queryClient.invalidateQueries({ queryKey: queryKeys.onboarding }),
  ];
  if (tripId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripDraftReview(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripSummary(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripTaskCommandRoot(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripReliability(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripWorkflows(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.providerHealth() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.providerCircuitBreakers() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripRouteBundles(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripCalendarEvents(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripSafetyCard(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripOfflineSnapshot(tripId) }),
    );
  }
  await Promise.all(invalidations);
}

export async function invalidateTripTaskServerState(
  queryClient: QueryClient,
  tripId: string | null | undefined,
): Promise<void> {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: queryKeys.trips }),
  ];
  if (tripId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripSummary(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripTaskCommandRoot(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripReliability(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripWorkflows(tripId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.providerHealth() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.providerCircuitBreakers() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tripRouteBundles(tripId) }),
    );
  }
  await Promise.all(invalidations);
}

export async function invalidateUserServerState(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences }),
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
    queryClient.invalidateQueries({ queryKey: queryKeys.paywallConfig }),
    queryClient.invalidateQueries({ queryKey: queryKeys.privacySettings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.mobileBetaConfig }),
  ]);
}
