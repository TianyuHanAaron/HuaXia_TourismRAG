import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import {
  CalendarExportResponseSchema,
  CalendarEventPreviewResponseSchema,
  MobileIncidentBannerResponseSchema,
  OfflineTaskUpdateSyncResponseSchema,
  OfflineTripSnapshotResponseSchema,
  ProviderCircuitBreakerSnapshotResponseSchema,
  ProviderCredentialReadinessResponseSchema,
  ProviderCostControlDecisionSchema,
  ProviderCostControlSummaryResponseSchema,
  ProviderHealthSnapshotResponseSchema,
  ProviderRegionalLatencyResponseSchema,
  RouteBundleListResponseSchema,
  SafetyCardResponseSchema,
  TripDurableWorkflowListResponseSchema,
  TripDraftReviewResponseSchema,
  TripExecutionEventListResponseSchema,
  TripListResponseSchema,
  TripNotificationDeliveryResponseSchema,
  TripRecentActivityResponseSchema,
  TripReliabilitySloTargetsResponseSchema,
  TripReliabilitySnapshotResponseSchema,
  TripRetentionApplyResponseSchema,
  TripRetentionSnapshotResponseSchema,
  TripReminderCandidateResponseSchema,
  TripResponseSchema,
  TripSummaryResponseSchema,
  TripTaskCommandResponseSchema,
  TripTraceEventListResponseSchema,
} from './schemas';
import {
  parseBookingMetadata,
  parseDocumentMetadata,
} from '../schemas/documents';
import { parseProviderFollowUp } from '../schemas/providerAction';
import { parseTaskCreate, parseTaskEdit } from '../schemas/task';
import type {
  CalendarExportRequest,
  CalendarExportResponse,
  CalendarEventPreviewResponse,
  MobileIncidentBannerResponse,
  OfflineTripSnapshotResponse,
  OfflineTaskUpdateSyncRequest,
  OfflineTaskUpdateSyncResponse,
  ProviderCircuitBreakerSnapshotResponse,
  ProviderCredentialReadinessResponse,
  ProviderCostControlCheckRequest,
  ProviderCostControlDecision,
  ProviderCostControlSummaryResponse,
  ProviderCostEntitlementTier,
  ProviderHealthSnapshotResponse,
  ProviderPartnerEnvironment,
  ProviderRegionalLatencyResponse,
  RouteBundleListResponse,
  SafetyCardResponse,
  TripDayReorderRequest,
  TripBookingCreateRequest,
  TripBookingPatchRequest,
  TripDocumentCreateRequest,
  TripDocumentPatchRequest,
  TripDurableWorkflowListResponse,
  TripDraftReviewResponse,
  TripExecutionEventCategory,
  TripExecutionEventListResponse,
  TripExecutionEventVisibility,
  TripListResponse,
  TripMilestoneCreateRequest,
  TripMilestonePatchRequest,
  TripNotificationDeliveryRequest,
  TripNotificationDeliveryResponse,
  TripProviderActionLaunchRequest,
  TripRecentActivityResponse,
  TripReliabilitySloTargetsResponse,
  TripReliabilitySnapshotResponse,
  TripRetentionApplyRequest,
  TripRetentionApplyResponse,
  TripRetentionSnapshotResponse,
  TripReminderCandidateResponse,
  TripResponse,
  TripTaskCommandResponse,
  TripTaskCreateRequest,
  TripTaskPatchRequest,
  TripTraceEventListResponse,
  TripTraceOperationType,
  TripSummaryResponse,
} from '../types/trip';

export async function listTrips(): Promise<TripListResponse> {
  return apiGet('/trips', TripListResponseSchema);
}

export async function getTrip(tripId: string): Promise<TripResponse> {
  return apiGet(`/trips/${tripId}`, TripResponseSchema);
}

export async function getTripDraftReview(
  tripId: string,
): Promise<TripDraftReviewResponse> {
  return apiGet(`/trips/${tripId}/draft-review`, TripDraftReviewResponseSchema);
}

export async function addDraftMilestone(
  tripId: string,
  milestone: TripMilestoneCreateRequest,
): Promise<TripResponse> {
  return apiPost(
    `/trips/${tripId}/draft/milestones`,
    milestone,
    TripResponseSchema,
  );
}

export async function patchDraftMilestone(
  tripId: string,
  milestoneId: string,
  milestone: TripMilestonePatchRequest,
): Promise<TripResponse> {
  return apiPatch(
    `/trips/${tripId}/draft/milestones/${milestoneId}`,
    milestone,
    TripResponseSchema,
  );
}

export async function deleteDraftMilestone(
  tripId: string,
  milestoneId: string,
): Promise<TripResponse> {
  return apiDelete(
    `/trips/${tripId}/draft/milestones/${milestoneId}`,
    TripResponseSchema,
  );
}

export async function reorderDraftDays(
  tripId: string,
  request: TripDayReorderRequest,
): Promise<TripResponse> {
  return apiPost(
    `/trips/${tripId}/draft/reorder-days`,
    request,
    TripResponseSchema,
  );
}

export async function createSampleTrip(): Promise<TripResponse> {
  return apiPost('/trips/samples', {}, TripResponseSchema);
}

export async function getTripSummary(tripId: string): Promise<TripSummaryResponse> {
  return apiGet(`/trips/${tripId}/summary`, TripSummaryResponseSchema);
}

export async function getTripTaskCommand(
  tripId: string,
  params?: {
    now?: string | null;
    completed_limit?: number;
  },
): Promise<TripTaskCommandResponse> {
  return apiGet(
    `/trips/${tripId}/task-command`,
    TripTaskCommandResponseSchema,
    {
      params: {
        now: params?.now ?? undefined,
        completed_limit: params?.completed_limit ?? undefined,
      },
    },
  );
}

export async function getTripReliability(
  tripId: string,
): Promise<TripReliabilitySnapshotResponse> {
  return apiGet(
    `/trips/${tripId}/reliability`,
    TripReliabilitySnapshotResponseSchema,
  );
}

export async function getTripRetention(
  tripId: string,
  params?: {
    now?: string | null;
    support_hold?: boolean | null;
  },
): Promise<TripRetentionSnapshotResponse> {
  return apiGet(
    `/trips/${tripId}/retention`,
    TripRetentionSnapshotResponseSchema,
    {
      params: {
        now: params?.now ?? undefined,
        support_hold: params?.support_hold ?? undefined,
      },
    },
  );
}

export async function applyTripRetention(
  tripId: string,
  request: TripRetentionApplyRequest,
): Promise<TripRetentionApplyResponse> {
  return apiPost(
    `/trips/${tripId}/retention/apply`,
    request,
    TripRetentionApplyResponseSchema,
  );
}

export async function getTripReliabilitySloTargets(): Promise<TripReliabilitySloTargetsResponse> {
  return apiGet('/trips/reliability/slos', TripReliabilitySloTargetsResponseSchema);
}

export async function listTripWorkflows(
  tripId: string,
): Promise<TripDurableWorkflowListResponse> {
  return apiGet(
    `/trips/${tripId}/workflows`,
    TripDurableWorkflowListResponseSchema,
  );
}

export async function getTripExecutionEvents(
  tripId: string,
  params?: {
    visibility?: TripExecutionEventVisibility | null;
    category?: TripExecutionEventCategory | null;
    limit?: number;
  },
): Promise<TripExecutionEventListResponse> {
  return apiGet(
    `/trips/${tripId}/execution-events`,
    TripExecutionEventListResponseSchema,
    {
      params: {
        visibility: params?.visibility ?? undefined,
        category: params?.category ?? undefined,
        limit: params?.limit ?? undefined,
      },
    },
  );
}

export async function getTripObservabilityTraces(
  tripId: string,
  params?: {
    operation_type?: TripTraceOperationType | null;
    correlation_id?: string | null;
    limit?: number | null;
  },
): Promise<TripTraceEventListResponse> {
  return apiGet(
    `/trips/${tripId}/observability/traces`,
    TripTraceEventListResponseSchema,
    {
      params: {
        operation_type: params?.operation_type ?? undefined,
        correlation_id: params?.correlation_id ?? undefined,
        limit: params?.limit ?? undefined,
      },
    },
  );
}

export async function getTripRecentActivity(
  tripId: string,
  params?: {
    limit?: number;
  },
): Promise<TripRecentActivityResponse> {
  return apiGet(
    `/trips/${tripId}/execution-events/mobile-activity`,
    TripRecentActivityResponseSchema,
    {
      params: {
        limit: params?.limit ?? undefined,
      },
    },
  );
}

export async function getProviderHealth(params?: {
  domain?: string | null;
  region?: string | null;
}): Promise<ProviderHealthSnapshotResponse> {
  return apiGet('/trips/provider-health', ProviderHealthSnapshotResponseSchema, {
    params: {
      domain: params?.domain ?? undefined,
      region: params?.region ?? undefined,
    },
  });
}

export async function getTripRegionalLatency(
  tripId: string,
  params?: {
    user_region?: string | null;
  },
): Promise<ProviderRegionalLatencyResponse> {
  return apiGet(
    `/trips/${tripId}/regional-latency`,
    ProviderRegionalLatencyResponseSchema,
    {
      params: {
        user_region: params?.user_region ?? undefined,
      },
    },
  );
}

export async function getProviderCredentialReadiness(params?: {
  domain?: string | null;
  environment?: ProviderPartnerEnvironment | null;
  now?: string | null;
}): Promise<ProviderCredentialReadinessResponse> {
  return apiGet(
    '/trips/provider-credentials',
    ProviderCredentialReadinessResponseSchema,
    {
      params: {
        domain: params?.domain ?? undefined,
        environment: params?.environment ?? undefined,
        now: params?.now ?? undefined,
      },
    },
  );
}

export async function getProviderCircuitBreakers(params?: {
  domain?: string | null;
  region?: string | null;
}): Promise<ProviderCircuitBreakerSnapshotResponse> {
  return apiGet(
    '/trips/provider-circuit-breakers',
    ProviderCircuitBreakerSnapshotResponseSchema,
    {
      params: {
        domain: params?.domain ?? undefined,
        region: params?.region ?? undefined,
      },
    },
  );
}

export async function getProviderCostControls(params?: {
  domain?: string | null;
  provider_id?: string | null;
  entitlement_tier?: ProviderCostEntitlementTier | null;
}): Promise<ProviderCostControlSummaryResponse> {
  return apiGet(
    '/trips/provider-cost-controls',
    ProviderCostControlSummaryResponseSchema,
    {
      params: {
        domain: params?.domain ?? undefined,
        provider_id: params?.provider_id ?? undefined,
        entitlement_tier: params?.entitlement_tier ?? undefined,
      },
    },
  );
}

export async function checkProviderCostControl(
  request: ProviderCostControlCheckRequest,
): Promise<ProviderCostControlDecision> {
  return apiPost(
    '/trips/provider-cost-controls/check',
    request,
    ProviderCostControlDecisionSchema,
  );
}

export async function getReminderCandidates(
  tripId: string,
  params?: {
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
  },
): Promise<TripReminderCandidateResponse> {
  return apiGet(
    `/trips/${tripId}/reminder-candidates`,
    TripReminderCandidateResponseSchema,
    {
      params: {
        quiet_hours_start: params?.quiet_hours_start ?? undefined,
        quiet_hours_end: params?.quiet_hours_end ?? undefined,
      },
    },
  );
}

export async function getNotificationDeliveries(
  tripId: string,
): Promise<TripNotificationDeliveryResponse> {
  return apiGet(
    `/trips/${tripId}/notification-deliveries`,
    TripNotificationDeliveryResponseSchema,
  );
}

export async function recordNotificationDeliveries(
  tripId: string,
  request: TripNotificationDeliveryRequest,
): Promise<TripNotificationDeliveryResponse> {
  return apiPost(
    `/trips/${tripId}/notification-deliveries`,
    request,
    TripNotificationDeliveryResponseSchema,
  );
}

export async function getRouteBundles(
  tripId: string,
  params?: {
    now?: string | null;
  },
): Promise<RouteBundleListResponse> {
  return apiGet(`/trips/${tripId}/route-bundles`, RouteBundleListResponseSchema, {
    params: {
      now: params?.now ?? undefined,
    },
  });
}

export async function revalidateRouteBundle(
  tripId: string,
  routeBundleId: string,
  params?: {
    now?: string | null;
  },
): Promise<RouteBundleListResponse> {
  return apiPost(
    `/trips/${tripId}/route-bundles/${routeBundleId}/revalidate`,
    {},
    RouteBundleListResponseSchema,
    {
      params: {
        now: params?.now ?? undefined,
      },
    },
  );
}

export async function getCalendarEvents(tripId: string): Promise<CalendarEventPreviewResponse> {
  return apiGet(
    `/trips/${tripId}/calendar-events`,
    CalendarEventPreviewResponseSchema,
  );
}

export async function exportCalendarEvents(
  tripId: string,
  request: CalendarExportRequest,
): Promise<CalendarExportResponse> {
  return apiPost(
    `/trips/${tripId}/calendar-export`,
    request,
    CalendarExportResponseSchema,
  );
}

export async function getSafetyCard(tripId: string): Promise<SafetyCardResponse> {
  return apiGet(`/trips/${tripId}/safety-card`, SafetyCardResponseSchema);
}

export async function getTripIncidentBanners(
  tripId: string,
): Promise<MobileIncidentBannerResponse> {
  return apiGet(
    `/trips/${tripId}/incidents/mobile-banners`,
    MobileIncidentBannerResponseSchema,
  );
}

export async function getOfflineSnapshot(
  tripId: string,
): Promise<OfflineTripSnapshotResponse> {
  return apiGet(
    `/trips/${tripId}/offline-snapshot`,
    OfflineTripSnapshotResponseSchema,
  );
}

export async function approveTrip(tripId: string): Promise<TripResponse> {
  return apiPost(`/trips/${tripId}/approve`, {}, TripResponseSchema);
}

export async function archiveTrip(tripId: string): Promise<TripResponse> {
  return apiPost(`/trips/${tripId}/archive`, {}, TripResponseSchema);
}

export async function completeTask(tripId: string, taskId: string): Promise<TripResponse> {
  return patchTask(tripId, taskId, { status: 'completed' });
}

export async function patchTask(
  tripId: string,
  taskId: string,
  task: TripTaskPatchRequest,
): Promise<TripResponse> {
  return apiPatch(
    `/trips/${tripId}/tasks/${taskId}`,
    parseTaskEdit(task),
    TripResponseSchema,
  );
}

export async function syncOfflineTaskUpdates(
  tripId: string,
  request: OfflineTaskUpdateSyncRequest,
): Promise<OfflineTaskUpdateSyncResponse> {
  return apiPost(
    `/trips/${tripId}/offline-task-updates`,
    request,
    OfflineTaskUpdateSyncResponseSchema,
  );
}

export async function addTask(
  tripId: string,
  task: TripTaskCreateRequest,
): Promise<TripResponse> {
  return apiPost(`/trips/${tripId}/tasks`, parseTaskCreate(task), TripResponseSchema);
}

export async function launchProviderAction(
  tripId: string,
  actionId: string,
  request?: TripProviderActionLaunchRequest,
): Promise<TripResponse> {
  return apiPost(
    `/trips/${tripId}/provider-actions/${actionId}/launch`,
    parseProviderFollowUp(request ?? {}),
    TripResponseSchema,
  );
}

export async function attachDocument(
  tripId: string,
  document: TripDocumentCreateRequest,
): Promise<TripResponse> {
  return apiPost(
    `/trips/${tripId}/documents`,
    parseDocumentMetadata(document),
    TripResponseSchema,
  );
}

export async function patchDocument(
  tripId: string,
  documentId: string,
  document: TripDocumentPatchRequest,
): Promise<TripResponse> {
  return apiPatch(
    `/trips/${tripId}/documents/${documentId}`,
    document,
    TripResponseSchema,
  );
}

export async function deleteDocument(
  tripId: string,
  documentId: string,
): Promise<TripResponse> {
  return apiDelete(`/trips/${tripId}/documents/${documentId}`, TripResponseSchema);
}

export async function attachBooking(
  tripId: string,
  booking: TripBookingCreateRequest,
): Promise<TripResponse> {
  return apiPost(
    `/trips/${tripId}/bookings`,
    parseBookingMetadata(booking),
    TripResponseSchema,
  );
}

export async function patchBooking(
  tripId: string,
  bookingId: string,
  booking: TripBookingPatchRequest,
): Promise<TripResponse> {
  return apiPatch(
    `/trips/${tripId}/bookings/${bookingId}`,
    booking,
    TripResponseSchema,
  );
}

export async function deleteBooking(
  tripId: string,
  bookingId: string,
): Promise<TripResponse> {
  return apiDelete(`/trips/${tripId}/bookings/${bookingId}`, TripResponseSchema);
}
