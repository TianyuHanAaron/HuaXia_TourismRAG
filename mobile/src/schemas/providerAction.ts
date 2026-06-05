import { z } from 'zod';
import type { TripProviderActionLaunchRequest } from '../types/trip';

export const providerLaunchChannelSchema = z.enum([
  'app',
  'browser',
  'fallback_browser',
  'manual_done',
  'remind_later',
]);

const optionalUrlSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine(
    (value) => {
      if (!value) {
        return true;
      }
      return /^(https?:\/\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(value);
    },
    { message: '服务链接格式不正确' },
  );

export const providerFollowUpSchema = z.object({
  launch_channel: providerLaunchChannelSchema.optional(),
  target_url: optionalUrlSchema,
  client_event_id: z.string().trim().min(1).max(160).nullable().optional(),
});

export type ProviderFollowUpForm = z.infer<typeof providerFollowUpSchema>;

export function parseProviderFollowUp(
  input: unknown,
): TripProviderActionLaunchRequest {
  return providerFollowUpSchema.parse(input) as TripProviderActionLaunchRequest;
}
