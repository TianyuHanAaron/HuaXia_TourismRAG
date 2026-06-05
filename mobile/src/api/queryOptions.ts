import {
  getCalendarEvents,
  getOfflineSnapshot,
  getReminderCandidates,
  getRouteBundles,
  getSafetyCard,
  getTrip,
  getTripDraftReview,
  getTripSummary,
  getTripTaskCommand,
  listTrips,
} from './trips';
import {
  getMobileBetaConfig,
  getOnboardingState,
  getPaywallConfig,
  getPreferences,
  getPrivacySettings,
  getSubscription,
} from './user';
import { queryKeys } from './queryKeys';

export const QUERY_STALE_MS = {
  immediate: 0,
  activeTrip: 20_000,
  reference: 5 * 60_000,
  static: 15 * 60_000,
};

export const tripQueries = {
  list() {
    return {
      queryKey: queryKeys.trips,
      queryFn: listTrips,
      staleTime: QUERY_STALE_MS.activeTrip,
    };
  },
  trip(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.trip(tripId),
      queryFn: () => getTrip(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.activeTrip,
    };
  },
  draftReview(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripDraftReview(tripId),
      queryFn: () => getTripDraftReview(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.activeTrip,
    };
  },
  summary(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripSummary(tripId),
      queryFn: () => getTripSummary(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.activeTrip,
    };
  },
  taskCommand(
    tripId: string | null | undefined,
    params?: { completedLimit?: number; now?: string | null },
  ) {
    return {
      queryKey: queryKeys.tripTaskCommand(tripId, params),
      queryFn: () =>
        getTripTaskCommand(requireTripId(tripId), {
          now: params?.now,
          completed_limit: params?.completedLimit,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  routeBundles(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripRouteBundles(tripId),
      queryFn: () => getRouteBundles(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  calendarEvents(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripCalendarEvents(tripId),
      queryFn: () => getCalendarEvents(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  safetyCard(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripSafetyCard(tripId),
      queryFn: () => getSafetyCard(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  offlineSnapshot(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripOfflineSnapshot(tripId),
      queryFn: () => getOfflineSnapshot(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  reminderCandidates(
    tripId: string | null | undefined,
    params?: { quietHoursStart?: string | null; quietHoursEnd?: string | null },
  ) {
    return {
      queryKey: queryKeys.tripReminderCandidates(tripId, params),
      queryFn: () =>
        getReminderCandidates(requireTripId(tripId), {
          quiet_hours_start: params?.quietHoursStart,
          quiet_hours_end: params?.quietHoursEnd,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
    };
  },
};

export const userQueries = {
  onboarding() {
    return {
      queryKey: queryKeys.onboarding,
      queryFn: getOnboardingState,
      staleTime: QUERY_STALE_MS.immediate,
    };
  },
  preferences() {
    return {
      queryKey: queryKeys.userPreferences,
      queryFn: getPreferences,
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  subscription() {
    return {
      queryKey: queryKeys.subscription,
      queryFn: getSubscription,
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  paywallConfig() {
    return {
      queryKey: queryKeys.paywallConfig,
      queryFn: getPaywallConfig,
      staleTime: QUERY_STALE_MS.static,
    };
  },
  privacySettings() {
    return {
      queryKey: queryKeys.privacySettings,
      queryFn: getPrivacySettings,
      staleTime: QUERY_STALE_MS.reference,
    };
  },
  mobileBetaConfig() {
    return {
      queryKey: queryKeys.mobileBetaConfig,
      queryFn: getMobileBetaConfig,
      staleTime: QUERY_STALE_MS.reference,
    };
  },
};

function requireTripId(tripId: string | null | undefined): string {
  if (!tripId) {
    throw new Error('tripId is required for this query');
  }
  return tripId;
}
