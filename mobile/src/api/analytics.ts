import { api } from './client';
import type {
  AnalyticsBatchRequest,
  AnalyticsBatchResponse,
  AnalyticsEventRequest,
  AnalyticsEventResponse,
} from '../types/analytics';

export async function recordAnalyticsEvent(
  event: AnalyticsEventRequest,
): Promise<AnalyticsEventResponse> {
  const response = await api.post<AnalyticsEventResponse>('/analytics/events', {
    source: 'mobile',
    ...event,
  });
  return response.data;
}

export async function flushAnalyticsEvents(
  batch: AnalyticsBatchRequest,
): Promise<AnalyticsBatchResponse> {
  const response = await api.post<AnalyticsBatchResponse>('/analytics/events/batch', {
    ...batch,
    events: batch.events.map((event) => ({
      source: 'mobile',
      offline_queued: true,
      ...event,
    })),
  });
  return response.data;
}
