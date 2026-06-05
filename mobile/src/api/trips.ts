import { api } from './client';
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
  const response = await api.get<TripListResponse>('/trips');
  return response.data;
}

export async function getTrip(tripId: string): Promise<TripResponse> {
  const response = await api.get<TripResponse>(`/trips/${tripId}`);
  return response.data;
}

export async function getTripDraftReview(
  tripId: string,
): Promise<TripDraftReviewResponse> {
  const response = await api.get<TripDraftReviewResponse>(
    `/trips/${tripId}/draft-review`,
  );
  return response.data;
}

export async function addDraftMilestone(
  tripId: string,
  milestone: TripMilestoneCreateRequest,
): Promise<TripResponse> {
  const response = await api.post<TripResponse>(
    `/trips/${tripId}/draft/milestones`,
    milestone,
  );
  return response.data;
}

export async function patchDraftMilestone(
  tripId: string,
  milestoneId: string,
  milestone: TripMilestonePatchRequest,
): Promise<TripResponse> {
  const response = await api.patch<TripResponse>(
    `/trips/${tripId}/draft/milestones/${milestoneId}`,
    milestone,
  );
  return response.data;
}

export async function deleteDraftMilestone(
  tripId: string,
  milestoneId: string,
): Promise<TripResponse> {
  const response = await api.delete<TripResponse>(
    `/trips/${tripId}/draft/milestones/${milestoneId}`,
  );
  return response.data;
}

export async function reorderDraftDays(
  tripId: string,
  request: TripDayReorderRequest,
): Promise<TripResponse> {
  const response = await api.post<TripResponse>(
    `/trips/${tripId}/draft/reorder-days`,
    request,
  );
  return response.data;
}

export async function createSampleTrip(): Promise<TripResponse> {
  const response = await api.post<TripResponse>('/trips/samples');
  return response.data;
}

export async function getTripSummary(tripId: string): Promise<TripSummaryResponse> {
  const response = await api.get<TripSummaryResponse>(`/trips/${tripId}/summary`);
  return response.data;
}

export async function getTripTaskCommand(
  tripId: string,
  params?: {
    now?: string | null;
    completed_limit?: number;
  },
): Promise<TripTaskCommandResponse> {
  const response = await api.get<TripTaskCommandResponse>(
    `/trips/${tripId}/task-command`,
    {
      params: {
        now: params?.now ?? undefined,
        completed_limit: params?.completed_limit ?? undefined,
      },
    },
  );
  return response.data;
}

export async function getReminderCandidates(
  tripId: string,
  params?: {
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
  },
): Promise<TripReminderCandidateResponse> {
  const response = await api.get<TripReminderCandidateResponse>(
    `/trips/${tripId}/reminder-candidates`,
    {
      params: {
        quiet_hours_start: params?.quiet_hours_start ?? undefined,
        quiet_hours_end: params?.quiet_hours_end ?? undefined,
      },
    },
  );
  return response.data;
}

export async function getRouteBundles(tripId: string): Promise<RouteBundleListResponse> {
  const response = await api.get<RouteBundleListResponse>(`/trips/${tripId}/route-bundles`);
  return response.data;
}

export async function getCalendarEvents(tripId: string): Promise<CalendarEventPreviewResponse> {
  const response = await api.get<CalendarEventPreviewResponse>(`/trips/${tripId}/calendar-events`);
  return response.data;
}

export async function exportCalendarEvents(
  tripId: string,
  request: CalendarExportRequest,
): Promise<CalendarExportResponse> {
  const response = await api.post<CalendarExportResponse>(
    `/trips/${tripId}/calendar-export`,
    request,
  );
  return response.data;
}

export async function getSafetyCard(tripId: string): Promise<SafetyCardResponse> {
  const response = await api.get<SafetyCardResponse>(`/trips/${tripId}/safety-card`);
  return response.data;
}

export async function getOfflineSnapshot(
  tripId: string,
): Promise<OfflineTripSnapshotResponse> {
  const response = await api.get<OfflineTripSnapshotResponse>(
    `/trips/${tripId}/offline-snapshot`,
  );
  return response.data;
}

export async function approveTrip(tripId: string): Promise<TripResponse> {
  const response = await api.post<TripResponse>(`/trips/${tripId}/approve`);
  return response.data;
}

export async function completeTask(tripId: string, taskId: string): Promise<TripResponse> {
  return patchTask(tripId, taskId, { status: 'completed' });
}

export async function patchTask(
  tripId: string,
  taskId: string,
  task: TripTaskPatchRequest,
): Promise<TripResponse> {
  const response = await api.patch<TripResponse>(
    `/trips/${tripId}/tasks/${taskId}`,
    task,
  );
  return response.data;
}

export async function addTask(
  tripId: string,
  task: TripTaskCreateRequest,
): Promise<TripResponse> {
  const response = await api.post<TripResponse>(`/trips/${tripId}/tasks`, task);
  return response.data;
}

export async function launchProviderAction(
  tripId: string,
  actionId: string,
  request?: TripProviderActionLaunchRequest,
): Promise<TripResponse> {
  const response = await api.post<TripResponse>(
    `/trips/${tripId}/provider-actions/${actionId}/launch`,
    request ?? {},
  );
  return response.data;
}

export async function attachDocument(
  tripId: string,
  document: TripDocumentCreateRequest,
): Promise<TripResponse> {
  const response = await api.post<TripResponse>(`/trips/${tripId}/documents`, document);
  return response.data;
}

export async function patchDocument(
  tripId: string,
  documentId: string,
  document: TripDocumentPatchRequest,
): Promise<TripResponse> {
  const response = await api.patch<TripResponse>(
    `/trips/${tripId}/documents/${documentId}`,
    document,
  );
  return response.data;
}

export async function deleteDocument(
  tripId: string,
  documentId: string,
): Promise<TripResponse> {
  const response = await api.delete<TripResponse>(`/trips/${tripId}/documents/${documentId}`);
  return response.data;
}

export async function attachBooking(
  tripId: string,
  booking: TripBookingCreateRequest,
): Promise<TripResponse> {
  const response = await api.post<TripResponse>(`/trips/${tripId}/bookings`, booking);
  return response.data;
}

export async function patchBooking(
  tripId: string,
  bookingId: string,
  booking: TripBookingPatchRequest,
): Promise<TripResponse> {
  const response = await api.patch<TripResponse>(
    `/trips/${tripId}/bookings/${bookingId}`,
    booking,
  );
  return response.data;
}

export async function deleteBooking(
  tripId: string,
  bookingId: string,
): Promise<TripResponse> {
  const response = await api.delete<TripResponse>(`/trips/${tripId}/bookings/${bookingId}`);
  return response.data;
}
