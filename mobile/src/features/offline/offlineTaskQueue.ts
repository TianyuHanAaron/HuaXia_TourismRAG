import { syncOfflineTaskUpdates } from '../../api/trips';
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
  duplicate: number;
  rejected: number;
  failed: number;
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
  if (queued.length === 0) {
    return {
      synced: 0,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      failed: 0,
      remaining: 0,
      conflicts: [],
    };
  }
  const response = await syncOfflineTaskUpdates(tripId, {
    mutations: queued.map((mutation) => ({
      mutation_id: mutation.clientMutationId,
      task_id: mutation.taskId,
      patch: mutation.patch,
      client_created_at: mutation.queuedAt,
      client_updated_at: mutation.queuedAt,
    })),
  });
  const acceptedIds = new Set(
    response.results
      .filter((result) =>
        ['accepted', 'applied', 'duplicate'].includes(result.status),
      )
      .map((result) => result.mutation_id),
  );
  const conflictIds = new Set(
    response.results
      .filter((result) => ['conflict', 'rejected'].includes(result.status))
      .map((result) => result.mutation_id),
  );
  const remaining = queued.filter(
    (mutation) => !acceptedIds.has(mutation.clientMutationId),
  );
  const conflicts = remaining.filter((mutation) =>
    conflictIds.has(mutation.clientMutationId),
  );

  if (remaining.length) {
    parseOfflineQueue(remaining);
    writeJsonToMmkv(queueKey(tripId), remaining);
  } else {
    await clearQueuedTaskMutations(tripId);
  }

  return {
    synced: response.applied_count + response.duplicate_count,
    accepted: response.applied_count,
    duplicate: response.duplicate_count,
    rejected: response.rejected_count + response.conflict_count,
    failed: response.failed_count,
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
