import { z } from 'zod';

export const tripStatusSchema = z.enum([
  'draft',
  'reviewing',
  'approved',
  'preparing',
  'traveling',
  'returning',
  'completed',
  'archived',
  'cancelled',
]);

export const tripTaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'skipped',
]);

export const tripOwnerAccountModeSchema = z.enum(['guest', 'registered']);

export const tripSummarySchema = z.object({
  trip_id: z.string(),
  status: tripStatusSchema,
  title: z.string(),
  destination: z.string().optional(),
  next_task_title: z.string().optional(),
  progress_percent: z.number().min(0).max(100).default(0),
});

export type TripStatus = z.infer<typeof tripStatusSchema>;
export type TripTaskStatus = z.infer<typeof tripTaskStatusSchema>;
export type TripOwnerAccountMode = z.infer<typeof tripOwnerAccountModeSchema>;
export type TripSummary = z.infer<typeof tripSummarySchema>;
