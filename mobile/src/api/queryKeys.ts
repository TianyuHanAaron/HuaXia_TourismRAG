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
  tripRouteBundles: (tripId: string | null | undefined) =>
    ['trip-route-bundles', stableId(tripId)] as const,
  tripCalendarEvents: (tripId: string | null | undefined) =>
    ['trip-calendar-events', stableId(tripId)] as const,
  tripSafetyCard: (tripId: string | null | undefined) =>
    ['trip-safety-card', stableId(tripId)] as const,
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
  userPreferences: ['user-preferences'] as const,
  subscription: ['subscription'] as const,
  paywallConfig: ['paywall-config'] as const,
  privacySettings: ['privacy-settings'] as const,
  mobileBetaConfig: ['v2-mobile-beta-config'] as const,
};

function stableId(value: string | null | undefined): string {
  return value ?? '';
}
