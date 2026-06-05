import {
  readJsonFromMmkv,
  removeMmkvKeys,
  writeJsonToMmkv,
} from '../../storage/mmkvStorage';
import type { OfflineTripSnapshotResponse, TripDocument } from '../../types/trip';

const LAST_TRIP_KEY = 'huaxia:last-offline-trip-id';

function snapshotKey(tripId: string): string {
  return `huaxia:offline-trip-snapshot:${tripId}`;
}

export async function cacheOfflineSnapshot(
  snapshot: OfflineTripSnapshotResponse,
): Promise<void> {
  const sanitized = sanitizeOfflineSnapshot(snapshot);
  writeJsonToMmkv(LAST_TRIP_KEY, sanitized.trip.trip_id);
  writeJsonToMmkv(snapshotKey(sanitized.trip.trip_id), sanitized);
}

export async function readOfflineSnapshot(
  tripId: string,
): Promise<OfflineTripSnapshotResponse | null> {
  return readJsonFromMmkv(snapshotKey(tripId), parseOfflineSnapshot);
}

export async function readLastOfflineSnapshot(): Promise<OfflineTripSnapshotResponse | null> {
  const tripId = readJsonFromMmkv(LAST_TRIP_KEY, parseString);
  return tripId ? readOfflineSnapshot(tripId) : null;
}

export async function clearOfflineSnapshots(): Promise<void> {
  const tripId = readJsonFromMmkv(LAST_TRIP_KEY, parseString);
  const keys = [LAST_TRIP_KEY];
  if (tripId) {
    keys.push(snapshotKey(tripId));
  }
  removeMmkvKeys(keys);
}

function sanitizeOfflineSnapshot(
  snapshot: OfflineTripSnapshotResponse,
): OfflineTripSnapshotResponse {
  return {
    ...snapshot,
    trip: {
      ...snapshot.trip,
      documents: snapshot.trip.documents?.map(sanitizeDocumentMetadata) ?? [],
    },
  };
}

function sanitizeDocumentMetadata(document: TripDocument): TripDocument {
  return {
    ...document,
    local_reference: null,
    storage_ref: null,
  };
}

function parseOfflineSnapshot(value: unknown): OfflineTripSnapshotResponse {
  if (!isRecord(value)) {
    throw new Error('Invalid offline snapshot');
  }
  const snapshot = value as OfflineTripSnapshotResponse;
  if (!snapshot.trip?.trip_id || !snapshot.sync_token || !snapshot.cache_key) {
    throw new Error('Invalid offline snapshot shape');
  }
  return sanitizeOfflineSnapshot(snapshot);
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
