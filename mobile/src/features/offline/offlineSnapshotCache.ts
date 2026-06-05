import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OfflineTripSnapshotResponse } from '../../types/trip';

const LAST_TRIP_KEY = 'huaxia:last-offline-trip-id';

function snapshotKey(tripId: string): string {
  return `huaxia:offline-trip-snapshot:${tripId}`;
}

export async function cacheOfflineSnapshot(
  snapshot: OfflineTripSnapshotResponse,
): Promise<void> {
  await AsyncStorage.multiSet([
    [LAST_TRIP_KEY, snapshot.trip.trip_id],
    [snapshotKey(snapshot.trip.trip_id), JSON.stringify(snapshot)],
  ]);
}

export async function readOfflineSnapshot(
  tripId: string,
): Promise<OfflineTripSnapshotResponse | null> {
  const raw = await AsyncStorage.getItem(snapshotKey(tripId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as OfflineTripSnapshotResponse;
  } catch {
    return null;
  }
}

export async function readLastOfflineSnapshot(): Promise<OfflineTripSnapshotResponse | null> {
  const tripId = await AsyncStorage.getItem(LAST_TRIP_KEY);
  return tripId ? readOfflineSnapshot(tripId) : null;
}

export async function clearOfflineSnapshots(): Promise<void> {
  const tripId = await AsyncStorage.getItem(LAST_TRIP_KEY);
  const keys = [LAST_TRIP_KEY];
  if (tripId) {
    keys.push(snapshotKey(tripId));
  }
  await AsyncStorage.multiRemove(keys);
}
