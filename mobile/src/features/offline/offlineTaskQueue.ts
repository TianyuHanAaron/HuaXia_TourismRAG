import AsyncStorage from '@react-native-async-storage/async-storage';

import { patchTask } from '../../api/trips';
import type { TripTaskPatchRequest, TripTaskStatus } from '../../types/trip';

export type QueuedTaskMutation = {
  clientMutationId: string;
  tripId: string;
  taskId: string;
  patch: TripTaskPatchRequest;
  queuedAt: string;
};

export type OfflineTaskSyncResult = {
  synced: number;
  remaining: number;
};

function queueKey(tripId: string): string {
  return `huaxia:offline-task-queue:${tripId}`;
}

export async function readQueuedTaskMutations(
  tripId: string,
): Promise<QueuedTaskMutation[]> {
  const raw = await AsyncStorage.getItem(queueKey(tripId));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function queueTaskStatusMutation(params: {
  tripId: string;
  taskId: string;
  status: TripTaskStatus;
  expectedUpdatedAt?: string | null;
}): Promise<QueuedTaskMutation[]> {
  const queued = await readQueuedTaskMutations(params.tripId);
  const clientMutationId = `offline-task-${params.tripId}-${params.taskId}-${Date.now()}`;
  const mutation: QueuedTaskMutation = {
    clientMutationId,
    tripId: params.tripId,
    taskId: params.taskId,
    queuedAt: new Date().toISOString(),
    patch: {
      status: params.status,
      expected_updated_at: params.expectedUpdatedAt ?? null,
      client_mutation_id: clientMutationId,
      offline_queued: true,
    },
  };
  const next = [...queued, mutation];
  await AsyncStorage.setItem(queueKey(params.tripId), JSON.stringify(next));
  return next;
}

export async function clearQueuedTaskMutations(tripId: string): Promise<void> {
  await AsyncStorage.removeItem(queueKey(tripId));
}

export async function syncQueuedTaskMutations(
  tripId: string,
): Promise<OfflineTaskSyncResult> {
  const queued = await readQueuedTaskMutations(tripId);
  const remaining: QueuedTaskMutation[] = [];
  let synced = 0;

  for (const mutation of queued) {
    try {
      await patchTask(mutation.tripId, mutation.taskId, mutation.patch);
      synced += 1;
    } catch {
      remaining.push(mutation);
    }
  }

  if (remaining.length) {
    await AsyncStorage.setItem(queueKey(tripId), JSON.stringify(remaining));
  } else {
    await clearQueuedTaskMutations(tripId);
  }

  return { synced, remaining: remaining.length };
}
