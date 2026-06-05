import { z } from 'zod';

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '请输入 HH:MM 格式时间');

export const userPreferenceFormSchema = z
  .object({
    map_provider: z.enum(['google_maps', 'apple_maps', 'mapbox']).default('google_maps'),
    hotel_platform: z
      .enum(['booking', 'agoda', 'expedia', 'hotel_website'])
      .default('booking'),
    flight_platform: z
      .enum(['skyscanner', 'airline_direct', 'google_flights'])
      .default('skyscanner'),
    calendar_provider: z.enum(['device_calendar', 'ics']).default('device_calendar'),
    language: z.enum(['zh-CN', 'en']).default('zh-CN'),
    currency: z.enum(['CNY', 'AUD', 'USD', 'GBP']).default('CNY'),
    notification_enabled: z.boolean().default(false),
    quiet_hours_start: timeSchema.nullable().optional(),
    quiet_hours_end: timeSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.quiet_hours_start) === Boolean(value.quiet_hours_end),
    {
      message: '请同时设置安静时段开始和结束时间',
      path: ['quiet_hours_end'],
    },
  );

export const privacySettingsPatchSchema = z.object({
  support_access_consent: z.boolean().optional(),
});

export type UserPreferenceForm = z.infer<typeof userPreferenceFormSchema>;
export type PrivacySettingsPatchForm = z.infer<typeof privacySettingsPatchSchema>;
