export const queryKeys = {
  onboarding: ['onboarding'] as const,
  trips: ['trips'] as const,
  trip: (tripId: string | null | undefined) => ['trip', stableId(tripId)] as const,
  tripDraftReview: (tripId: string | null | undefined) =>
    ['trip-draft-review', stableId(tripId)] as const,
  tripSummary: (tripId: string | null | undefined) =>
    ['trip-summary', stableId(tripId)] as const,
  tripTaskCommandRoot: (tripId: string | null | undefined) =>
    ['trip-task-command', stableId(tripId)] as const,
  tripTaskCommand: (
    tripId: string | null | undefined,
    params?: { completedLimit?: number; now?: string | null },
  ) =>
    [
      'trip-task-command',
      stableId(tripId),
      params?.completedLimit ?? null,
      params?.now ?? null,
    ] as const,
  tripReliability: (tripId: string | null | undefined) =>
    ['trip-reliability', stableId(tripId)] as const,
  tripRetention: (
    tripId: string | null | undefined,
    params?: { supportHold?: boolean | null; now?: string | null },
  ) =>
    [
      'trip-retention',
      stableId(tripId),
      params?.supportHold ?? null,
      params?.now ?? null,
    ] as const,
  tripReliabilitySloTargets: ['trip-reliability-slo-targets'] as const,
  tripWorkflows: (tripId: string | null | undefined) =>
    ['trip-workflows', stableId(tripId)] as const,
  tripExecutionEvents: (
    tripId: string | null | undefined,
    params?: {
      visibility?: string | null;
      category?: string | null;
      limit?: number | null;
    },
  ) =>
    [
      'trip-execution-events',
      stableId(tripId),
      params?.visibility ?? null,
      params?.category ?? null,
      params?.limit ?? null,
    ] as const,
  tripObservabilityTraces: (
    tripId: string | null | undefined,
    params?: {
      operationType?: string | null;
      correlationId?: string | null;
      limit?: number | null;
    },
  ) =>
    [
      'trip-observability-traces',
      stableId(tripId),
      params?.operationType ?? null,
      params?.correlationId ?? null,
      params?.limit ?? null,
    ] as const,
  tripRecentActivity: (
    tripId: string | null | undefined,
    params?: { limit?: number | null },
  ) =>
    [
      'trip-recent-activity',
      stableId(tripId),
      params?.limit ?? null,
    ] as const,
  providerHealth: (params?: { domain?: string | null; region?: string | null }) =>
    ['provider-health', params?.domain ?? null, params?.region ?? null] as const,
  tripRegionalLatency: (
    tripId: string | null | undefined,
    params?: { userRegion?: string | null },
  ) =>
    [
      'trip-regional-latency',
      stableId(tripId),
      params?.userRegion ?? null,
    ] as const,
  providerCredentialReadiness: (params?: {
    domain?: string | null;
    environment?: string | null;
    now?: string | null;
  }) =>
    [
      'provider-credential-readiness',
      params?.domain ?? null,
      params?.environment ?? null,
      params?.now ?? null,
    ] as const,
  providerCircuitBreakers: (params?: { domain?: string | null; region?: string | null }) =>
    ['provider-circuit-breakers', params?.domain ?? null, params?.region ?? null] as const,
  providerCostControls: (params?: {
    domain?: string | null;
    providerId?: string | null;
    entitlementTier?: string | null;
  }) =>
    [
      'provider-cost-controls',
      params?.domain ?? null,
      params?.providerId ?? null,
      params?.entitlementTier ?? null,
    ] as const,
  tripRouteBundles: (tripId: string | null | undefined) =>
    ['trip-route-bundles', stableId(tripId)] as const,
  tripRouteBundleRevalidation: (
    tripId: string | null | undefined,
    routeBundleId: string | null | undefined,
  ) => ['trip-route-bundle-revalidation', stableId(tripId), stableId(routeBundleId)] as const,
  tripCalendarEvents: (tripId: string | null | undefined) =>
    ['trip-calendar-events', stableId(tripId)] as const,
  tripSafetyCard: (tripId: string | null | undefined) =>
    ['trip-safety-card', stableId(tripId)] as const,
  tripIncidentBanners: (tripId: string | null | undefined) =>
    ['trip-incident-banners', stableId(tripId)] as const,
  tripOfflineSnapshot: (tripId: string | null | undefined) =>
    ['trip-offline-snapshot', stableId(tripId)] as const,
  tripReminderCandidates: (
    tripId: string | null | undefined,
    params?: { quietHoursStart?: string | null; quietHoursEnd?: string | null },
  ) =>
    [
      'trip-reminder-candidates',
      stableId(tripId),
      params?.quietHoursStart ?? null,
      params?.quietHoursEnd ?? null,
    ] as const,
  tripNotificationDeliveries: (tripId: string | null | undefined) =>
    ['trip-notification-deliveries', stableId(tripId)] as const,
  userPreferences: ['user-preferences'] as const,
  subscription: ['subscription'] as const,
  paywallConfig: ['paywall-config'] as const,
  privacySettings: ['privacy-settings'] as const,
  securityPosture: ['support-security-posture'] as const,
  adminOperationsConsole: ['support-admin-operations-console'] as const,
  capacityPlanningReport: (params?: {
    runMode?: string | null;
    providerMode?: string | null;
  }) =>
    [
      'support-capacity-planning',
      params?.runMode ?? null,
      params?.providerMode ?? null,
    ] as const,
  qualityEvaluationReport: (params?: { runMode?: string | null }) =>
    ['support-quality-evaluation', params?.runMode ?? null] as const,
  promptDtoRegressionReport: (params?: { runMode?: string | null }) =>
    ['support-prompt-dto-regression', params?.runMode ?? null] as const,
  complianceIncidentReport: ['support-compliance-incidents'] as const,
  supportRecoveryPlaybooks: (
    targetUserId: string | null | undefined,
    tripId: string | null | undefined,
  ) =>
    [
      'support-recovery-playbooks',
      stableId(targetUserId),
      stableId(tripId),
    ] as const,
  v5BusinessScaleReadiness: ['v5-business-scale-readiness'] as const,
  mobileBetaConfig: ['v2-mobile-beta-config'] as const,
};

function stableId(value: string | null | undefined): string {
  return value ?? '';
}
