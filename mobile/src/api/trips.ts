import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import {
  CalendarExportResponseSchema,
  CalendarEventPreviewResponseSchema,
  OfflineTripSnapshotResponseSchema,
  RouteBundleListResponseSchema,
  SafetyCardResponseSchema,
  TripDraftReviewResponseSchema,
  TripListResponseSchema,
  TripReminderCandidateResponseSchema,
  TripResponseSchema,
  TripSummaryResponseSchema,
  TripTaskCommandResponseSchema,
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
  OfflineTripSnapshotResponse,
  RouteBundleListResponse,
  SafetyCardResponse,
  TripDayReorderRequest,
  TripBookingCreateRequest,
  TripBookingPatchRequest,
  TripDocumentCreateRequest,
  TripDocumentPatchRequest,
  TripDraftReviewResponse,
  TripListResponse,
  TripMilestoneCreateRequest,
  TripMilestonePatchRequest,
  TripProviderActionLaunchRequest,
  TripReminderCandidateResponse,
  TripResponse,
  TripTaskCommandResponse,
  TripTaskCreateRequest,
  TripTaskPatchRequest,
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

export async function getRouteBundles(tripId: string): Promise<RouteBundleListResponse> {
  return apiGet(`/trips/${tripId}/route-bundles`, RouteBundleListResponseSchema);
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
