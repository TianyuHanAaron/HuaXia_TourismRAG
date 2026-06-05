import {
  readJsonFromMmkv,
  removeMmkvKeys,
  writeJsonToMmkv,
} from '../../storage/mmkvStorage';
import type { TripSummaryResponse } from '../../types/trip';

const LAST_TRIP_HOME_SUMMARY_KEY = 'huaxia:last-trip-home-summary-id';

function tripHomeSummaryKey(tripId: string): string {
  return `huaxia:trip-home-summary:${tripId}`;
}

export function cacheTripHomeSummary(summary: TripSummaryResponse): void {
  const sanitized = sanitizeTripHomeSummary(summary);
  writeJsonToMmkv(LAST_TRIP_HOME_SUMMARY_KEY, sanitized.trip_id);
  writeJsonToMmkv(tripHomeSummaryKey(sanitized.trip_id), sanitized);
}

export function readTripHomeSummary(tripId: string): TripSummaryResponse | null {
  return readJsonFromMmkv(tripHomeSummaryKey(tripId), parseTripHomeSummary);
}

export function readLastTripHomeSummary(): TripSummaryResponse | null {
  const tripId = readJsonFromMmkv(LAST_TRIP_HOME_SUMMARY_KEY, parseString);
  return tripId ? readTripHomeSummary(tripId) : null;
}

export function clearTripHomeSummaryCache(): void {
  const tripId = readJsonFromMmkv(LAST_TRIP_HOME_SUMMARY_KEY, parseString);
  const keys = [LAST_TRIP_HOME_SUMMARY_KEY];
  if (tripId) {
    keys.push(tripHomeSummaryKey(tripId));
  }
  removeMmkvKeys(keys);
}

function sanitizeTripHomeSummary(summary: TripSummaryResponse): TripSummaryResponse {
  return {
    ...summary,
    urgent_warnings: summary.urgent_warnings.slice(0, 5),
  };
}

function parseTripHomeSummary(value: unknown): TripSummaryResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid trip home summary');
  }
  const summary = value as TripSummaryResponse;
  if (!summary.trip_id || !summary.title || !summary.status || !summary.updated_at) {
    throw new Error('Invalid trip home summary shape');
  }
  return sanitizeTripHomeSummary(summary);
}

function parseString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Invalid string cache value');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
