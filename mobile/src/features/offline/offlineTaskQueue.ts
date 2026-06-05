import { isAxiosError } from 'axios';

import { patchTask } from '../../api/trips';
import {
  buildQueuedTaskStatusMutation,
  parseOfflineQueue,
  type QueuedTaskStatusMutation,
} from '../../schemas/offlineQueue';
import {
  readJsonFromMmkv,
  removeMmkvKey,
  writeJsonToMmkv,
} from '../../storage/mmkvStorage';
import type { TripTaskStatus } from '../../types/trip';

export type QueuedTaskMutation = QueuedTaskStatusMutation;

export type OfflineTaskSyncResult = {
  synced: number;
  accepted: number;
  rejected: number;
  remaining: number;
  conflicts: QueuedTaskMutation[];
};

function queueKey(tripId: string): string {
  return `huaxia:offline-task-queue:${tripId}`;
}

export async function readQueuedTaskMutations(
  tripId: string,
): Promise<QueuedTaskMutation[]> {
  return readJsonFromMmkv(queueKey(tripId), parseQueuedTaskMutations) ?? [];
}

export async function queueTaskStatusMutation(params: {
  tripId: string;
  taskId: string;
  status: TripTaskStatus;
  expectedUpdatedAt?: string | null;
}): Promise<QueuedTaskMutation[]> {
  const queued = await readQueuedTaskMutations(params.tripId);
  const mutation = buildQueuedTaskStatusMutation({
    tripId: params.tripId,
    taskId: params.taskId,
    status: params.status,
    expectedUpdatedAt: params.expectedUpdatedAt,
  });
  const next = [...queued, mutation];
  parseOfflineQueue(next);
  writeJsonToMmkv(queueKey(params.tripId), next);
  return next;
}

export async function clearQueuedTaskMutations(tripId: string): Promise<void> {
  removeMmkvKey(queueKey(tripId));
}

export async function syncQueuedTaskMutations(
  tripId: string,
): Promise<OfflineTaskSyncResult> {
  const queued = await readQueuedTaskMutations(tripId);
  const remaining: QueuedTaskMutation[] = [];
  const conflicts: QueuedTaskMutation[] = [];
  let synced = 0;

  for (const mutation of queued) {
    try {
      await patchTask(mutation.tripId, mutation.taskId, mutation.patch);
      synced += 1;
    } catch (error) {
      if (isConflictError(error)) {
        conflicts.push(mutation);
      }
      remaining.push(mutation);
    }
  }

  if (remaining.length) {
    parseOfflineQueue(remaining);
    writeJsonToMmkv(queueKey(tripId), remaining);
  } else {
    await clearQueuedTaskMutations(tripId);
  }

  return {
    synced,
    accepted: synced,
    rejected: conflicts.length,
    remaining: remaining.length,
    conflicts,
  };
}

function parseQueuedTaskMutations(value: unknown): QueuedTaskMutation[] {
  return parseOfflineQueue(value).filter(
    (mutation): mutation is QueuedTaskStatusMutation =>
      mutation.type === 'task_status_patch',
  );
}

function isConflictError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  return error.response?.status === 409 || error.response?.status === 412;
}
