import { z } from 'zod';
import type { TripReminderCandidate } from '../types/trip';

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '请输入 HH:MM 格式时间');

const isoDateTimeSchema = z.string().trim().refine(
  (value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  },
  { message: '时间格式不正确' },
);

export const reminderSettingsSchema = z
  .object({
    enabled: z.boolean().default(true),
    quiet_hours_start: timeSchema.nullable().optional(),
    quiet_hours_end: timeSchema.nullable().optional(),
    default_offsets_minutes: z
      .array(z.number().int().min(0).max(10_080))
      .max(8)
      .default([1440, 120]),
  })
  .refine(
    (value) =>
      Boolean(value.quiet_hours_start) === Boolean(value.quiet_hours_end),
    {
      message: '请同时设置安静时段开始和结束时间',
      path: ['quiet_hours_end'],
    },
  );

export const tripReminderCandidateSchema = z.object({
  trip_id: z.string().trim().min(1),
  task_id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  category: z.string().trim().min(1),
  phase_type: z.string().trim().min(1),
  priority: z.string().trim().min(1),
  due_at: isoDateTimeSchema,
  reminder_at: isoDateTimeSchema,
  offset_minutes: z.number().int(),
  quiet_hours_adjusted: z.boolean(),
  tap_target: z.string().trim().min(1),
});

export type ReminderSettingsForm = z.infer<typeof reminderSettingsSchema>;

export function parseReminderCandidates(
  candidates: unknown,
): TripReminderCandidate[] {
  return z.array(tripReminderCandidateSchema).parse(candidates) as TripReminderCandidate[];
}
