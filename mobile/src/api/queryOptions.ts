import {
  getCalendarEvents,
  getNotificationDeliveries,
  getOfflineSnapshot,
  getProviderCircuitBreakers,
  getProviderCredentialReadiness,
  getProviderCostControls,
  getProviderHealth,
  getReminderCandidates,
  getRouteBundles,
  getSafetyCard,
  getTrip,
  getTripDraftReview,
  getTripExecutionEvents,
  getTripIncidentBanners,
  getTripObservabilityTraces,
  getTripRecentActivity,
  getTripRegionalLatency,
  getTripReliability,
  getTripReliabilitySloTargets,
  getTripRetention,
  getTripSummary,
  getTripTaskCommand,
  listTripWorkflows,
  listTrips,
  revalidateRouteBundle,
} from './trips';
import {
  getAdminOperationsConsole,
  getCapacityPlanningReport,
  getComplianceIncidentReport,
  getPromptDtoRegressionReport,
  getQualityEvaluationReport,
  getSupportRecoveryPlaybooks,
  getMobileBetaConfig,
  getOnboardingState,
  getPaywallConfig,
  getPreferences,
  getPrivacySettings,
  getSecurityPosture,
  getSubscription,
  getV5BusinessScaleReadiness,
} from './user';
import { queryKeys } from './queryKeys';
import type {
  ProviderCostEntitlementTier,
  ProviderPartnerEnvironment,
  CapacityPlanningProviderMode,
  CapacityPlanningRunMode,
  PromptDtoRegressionRunMode,
  QualityEvaluationRunMode,
  TripExecutionEventCategory,
  TripExecutionEventVisibility,
  TripTraceOperationType,
} from '../types/trip';

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
  reliability(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripReliability(tripId),
      queryFn: () => getTripReliability(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  retention(
    tripId: string | null | undefined,
    params?: { supportHold?: boolean | null; now?: string | null },
  ) {
    return {
      queryKey: queryKeys.tripRetention(tripId, params),
      queryFn: () =>
        getTripRetention(requireTripId(tripId), {
          support_hold: params?.supportHold,
          now: params?.now,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  reliabilitySloTargets() {
    return {
      queryKey: queryKeys.tripReliabilitySloTargets,
      queryFn: getTripReliabilitySloTargets,
      staleTime: QUERY_STALE_MS.static,
    };
  },
  workflows(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripWorkflows(tripId),
      queryFn: () => listTripWorkflows(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  executionEvents(
    tripId: string | null | undefined,
    params?: {
      visibility?: TripExecutionEventVisibility | null;
      category?: TripExecutionEventCategory | null;
      limit?: number | null;
    },
  ) {
    return {
      queryKey: queryKeys.tripExecutionEvents(tripId, params),
      queryFn: () =>
        getTripExecutionEvents(requireTripId(tripId), {
          visibility: params?.visibility,
          category: params?.category,
          limit: params?.limit ?? undefined,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  observabilityTraces(
    tripId: string | null | undefined,
    params?: {
      operationType?: TripTraceOperationType | null;
      correlationId?: string | null;
      limit?: number | null;
    },
  ) {
    return {
      queryKey: queryKeys.tripObservabilityTraces(tripId, params),
      queryFn: () =>
        getTripObservabilityTraces(requireTripId(tripId), {
          operation_type: params?.operationType,
          correlation_id: params?.correlationId,
          limit: params?.limit ?? undefined,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  recentActivity(
    tripId: string | null | undefined,
    params?: { limit?: number | null },
  ) {
    return {
      queryKey: queryKeys.tripRecentActivity(tripId, params),
      queryFn: () =>
        getTripRecentActivity(requireTripId(tripId), {
          limit: params?.limit ?? undefined,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  providerHealth(params?: { domain?: string | null; region?: string | null }) {
    return {
      queryKey: queryKeys.providerHealth(params),
      queryFn: () => getProviderHealth(params),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  regionalLatency(
    tripId: string | null | undefined,
    params?: { userRegion?: string | null },
  ) {
    return {
      queryKey: queryKeys.tripRegionalLatency(tripId, params),
      queryFn: () =>
        getTripRegionalLatency(requireTripId(tripId), {
          user_region: params?.userRegion ?? undefined,
        }),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  providerCredentialReadiness(params?: {
    domain?: string | null;
    environment?: ProviderPartnerEnvironment | null;
    now?: string | null;
  }) {
    return {
      queryKey: queryKeys.providerCredentialReadiness(params),
      queryFn: () => getProviderCredentialReadiness(params),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  providerCircuitBreakers(params?: { domain?: string | null; region?: string | null }) {
    return {
      queryKey: queryKeys.providerCircuitBreakers(params),
      queryFn: () => getProviderCircuitBreakers(params),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  providerCostControls(params?: {
    domain?: string | null;
    providerId?: string | null;
    entitlementTier?: ProviderCostEntitlementTier | null;
  }) {
    return {
      queryKey: queryKeys.providerCostControls(params),
      queryFn: () =>
        getProviderCostControls({
          domain: params?.domain,
          provider_id: params?.providerId,
          entitlement_tier: params?.entitlementTier,
        }),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  routeBundles(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripRouteBundles(tripId),
      queryFn: () => getRouteBundles(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  routeBundleRevalidation(
    tripId: string | null | undefined,
    routeBundleId: string | null | undefined,
  ) {
    return {
      queryKey: queryKeys.tripRouteBundleRevalidation(tripId, routeBundleId),
      queryFn: () =>
        revalidateRouteBundle(requireTripId(tripId), requireTripId(routeBundleId)),
      enabled: Boolean(tripId && routeBundleId),
      staleTime: QUERY_STALE_MS.immediate,
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
  tripIncidentBanners(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripIncidentBanners(tripId),
      queryFn: () => getTripIncidentBanners(requireTripId(tripId)),
      enabled: Boolean(tripId),
      staleTime: QUERY_STALE_MS.activeTrip,
      refetchOnReconnect: true,
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
  notificationDeliveries(tripId: string | null | undefined) {
    return {
      queryKey: queryKeys.tripNotificationDeliveries(tripId),
      queryFn: () => getNotificationDeliveries(requireTripId(tripId)),
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
  securityPosture() {
    return {
      queryKey: queryKeys.securityPosture,
      queryFn: getSecurityPosture,
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  adminOperationsConsole() {
    return {
      queryKey: queryKeys.adminOperationsConsole,
      queryFn: getAdminOperationsConsole,
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  capacityPlanningReport(params?: {
    runMode?: CapacityPlanningRunMode | null;
    providerMode?: CapacityPlanningProviderMode | null;
  }) {
    return {
      queryKey: queryKeys.capacityPlanningReport(params),
      queryFn: () =>
        getCapacityPlanningReport({
          run_mode: params?.runMode,
          provider_mode: params?.providerMode,
        }),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  qualityEvaluationReport(params?: { runMode?: QualityEvaluationRunMode | null }) {
    return {
      queryKey: queryKeys.qualityEvaluationReport(params),
      queryFn: () =>
        getQualityEvaluationReport({
          run_mode: params?.runMode,
        }),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  promptDtoRegressionReport(params?: {
    runMode?: PromptDtoRegressionRunMode | null;
  }) {
    return {
      queryKey: queryKeys.promptDtoRegressionReport(params),
      queryFn: () =>
        getPromptDtoRegressionReport({
          run_mode: params?.runMode,
        }),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  complianceIncidentReport() {
    return {
      queryKey: queryKeys.complianceIncidentReport,
      queryFn: getComplianceIncidentReport,
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  supportRecoveryPlaybooks(
    targetUserId: string | null | undefined,
    tripId: string | null | undefined,
  ) {
    return {
      queryKey: queryKeys.supportRecoveryPlaybooks(targetUserId, tripId),
      queryFn: () =>
        getSupportRecoveryPlaybooks(
          requireNonEmptyId(targetUserId, 'targetUserId'),
          requireNonEmptyId(tripId, 'tripId'),
        ),
      enabled: Boolean(targetUserId && tripId),
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
    };
  },
  v5BusinessScaleReadiness() {
    return {
      queryKey: queryKeys.v5BusinessScaleReadiness,
      queryFn: getV5BusinessScaleReadiness,
      staleTime: QUERY_STALE_MS.immediate,
      refetchOnReconnect: true,
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

function requireNonEmptyId(value: string | null | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} is required for this query`);
  }
  return value;
}
