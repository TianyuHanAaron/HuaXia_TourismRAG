import { apiPost } from './client';
import {
  AnalyticsBatchResponseSchema,
  AnalyticsEventResponseSchema,
} from './schemas';
import type {
  AnalyticsBatchRequest,
  AnalyticsBatchResponse,
  AnalyticsEventRequest,
  AnalyticsEventResponse,
} from '../types/analytics';

export async function recordAnalyticsEvent(
  event: AnalyticsEventRequest,
): Promise<AnalyticsEventResponse> {
  return apiPost(
    '/analytics/events',
    {
      source: 'mobile',
      ...event,
    },
    AnalyticsEventResponseSchema,
  );
}

export async function flushAnalyticsEvents(
  batch: AnalyticsBatchRequest,
): Promise<AnalyticsBatchResponse> {
  return apiPost(
    '/analytics/events/batch',
    {
      ...batch,
      events: batch.events.map((event) => ({
        source: 'mobile',
        offline_queued: true,
        ...event,
      })),
    },
    AnalyticsBatchResponseSchema,
  );
}
