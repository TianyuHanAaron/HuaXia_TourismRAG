import { z } from 'zod';
import type {
  TripTaskCreateRequest,
  TripTaskPatchRequest,
  TripTaskStatus,
} from '../types/trip';

export const tripTaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'skipped',
]);

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const nullableTextSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => (value ? value : value ?? null));

export const taskEditSchema = z
  .object({
    title: optionalTextSchema,
    instruction: optionalTextSchema,
    status: tripTaskStatusSchema.optional(),
    priority: optionalTextSchema,
    blocked_reason: nullableTextSchema,
    expected_updated_at: nullableTextSchema,
    client_mutation_id: optionalTextSchema,
    offline_queued: z.boolean().optional(),
  })
  .refine(
    (value) =>
      Object.values(value).some(
        (fieldValue) => fieldValue !== undefined && fieldValue !== null && fieldValue !== '',
      ),
    {
      message: '至少需要修改一个任务字段',
    },
  );

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, '请填写任务标题').max(120),
  instruction: optionalTextSchema,
  category: optionalTextSchema,
  phase_type: optionalTextSchema,
  due_at: nullableTextSchema,
  priority: optionalTextSchema,
});

export type TaskEditForm = z.infer<typeof taskEditSchema>;

export function parseTaskEdit(input: unknown): TripTaskPatchRequest {
  return taskEditSchema.parse(input) as TripTaskPatchRequest;
}

export function parseTaskCreate(input: unknown): TripTaskCreateRequest {
  return taskCreateSchema.parse(input) as TripTaskCreateRequest;
}

export function parseTripTaskStatus(input: unknown): TripTaskStatus {
  return tripTaskStatusSchema.parse(input) as TripTaskStatus;
}
