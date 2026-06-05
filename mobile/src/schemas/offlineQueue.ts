import { z } from 'zod';
import type { TripTaskStatus } from '../types/trip';
import { tripTaskStatusSchema } from './task';

const isoDateTimeSchema = z.string().trim().refine(
  (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  },
  { message: '时间格式不正确' },
);

export const offlineTaskStatusPatchSchema = z.object({
  status: tripTaskStatusSchema,
  expected_updated_at: z.string().nullable().optional(),
  client_mutation_id: z.string().trim().min(1),
  offline_queued: z.literal(true),
});

export const offlineTaskStatusMutationSchema = z.object({
  type: z.literal('task_status_patch'),
  schema_version: z.literal(1),
  clientMutationId: z.string().trim().min(1),
  tripId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
  patch: offlineTaskStatusPatchSchema,
  queuedAt: isoDateTimeSchema,
});

export const offlineQueueItemSchema = z.discriminatedUnion('type', [
  offlineTaskStatusMutationSchema,
]);

export const offlineQueueSchema = z.array(offlineQueueItemSchema);

export type OfflineQueueItem = z.infer<typeof offlineQueueItemSchema>;
export type QueuedTaskStatusMutation = z.infer<typeof offlineTaskStatusMutationSchema>;

export function parseOfflineQueue(input: unknown): OfflineQueueItem[] {
  return offlineQueueSchema.parse(input);
}

export function buildQueuedTaskStatusMutation(params: {
  tripId: string;
  taskId: string;
  status: TripTaskStatus;
  expectedUpdatedAt?: string | null;
  now?: Date;
}): QueuedTaskStatusMutation {
  const queuedAt = (params.now ?? new Date()).toISOString();
  const clientMutationId = `offline-task-${params.tripId}-${params.taskId}-${Date.now()}`;
  return offlineTaskStatusMutationSchema.parse({
    type: 'task_status_patch',
    schema_version: 1,
    clientMutationId,
    tripId: params.tripId,
    taskId: params.taskId,
    queuedAt,
    patch: {
      status: params.status,
      expected_updated_at: params.expectedUpdatedAt ?? null,
      client_mutation_id: clientMutationId,
      offline_queued: true,
    },
  });
}
