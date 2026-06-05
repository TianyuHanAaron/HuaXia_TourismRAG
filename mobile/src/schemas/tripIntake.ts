import { z } from 'zod';
import type { TravelFormRequest } from '../types/trip';

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || isIsoDate(value), {
    message: '请输入 YYYY-MM-DD 格式日期',
  });

export const tripIntakeSchema = z
  .object({
    requestMode: z.enum(['normal', 'diy']).default('normal'),
    originCity: z.string().trim().min(1, '请填写出发城市').max(80),
    returnCity: z.string().trim().max(80).optional(),
    destinations: z.array(z.string().trim().min(1)).min(1, '至少选择一个目的地').max(12),
    startDate: optionalDate,
    endDate: optionalDate,
    adults: z.number().int().min(0).max(20).default(2),
    elders: z.number().int().min(0).max(10).default(0),
    children: z.number().int().min(0).max(10).default(0),
    budgetLevel: z.enum(['budget', 'mid_range', 'luxury']).nullable().default(null),
    travelModePreference: z
      .enum(['train_first', 'flight_first', 'self_drive', 'charter_when_needed', 'mixed'])
      .default('mixed'),
    pace: z.enum(['relaxed', 'balanced', 'intensive']).default('balanced'),
    routeStrictness: z
      .enum(['flexible', 'must_cover_all', 'theme_pure', 'balanced_city'])
      .default('flexible'),
    attractionPreferences: z.array(z.string()).default(['history_culture', 'nature', 'food']),
    accommodationPreference: z
      .enum(['convenient', 'luxury', 'boutique', 'budget'])
      .default('convenient'),
    foodPreference: z
      .enum(['local_snacks', 'classic_restaurants', 'fine_dining', 'balanced'])
      .default('balanced'),
    preferredMapProvider: z
      .enum(['google_maps', 'apple_maps', 'mapbox', 'unknown'])
      .default('unknown'),
    preferredHotelPlatform: z
      .enum(['booking', 'agoda', 'expedia', 'hotel_website', 'unknown'])
      .default('unknown'),
    notificationPreference: z
      .enum(['enabled', 'disabled', 'prompt_later', 'unknown'])
      .default('prompt_later'),
    extraNotes: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.adults + value.elders + value.children > 0, {
    message: '至少需要一位出行人',
    path: ['adults'],
  })
  .refine(
    (value) => {
      if (!value.startDate || !value.endDate) {
        return true;
      }
      return new Date(value.endDate).getTime() >= new Date(value.startDate).getTime();
    },
    {
      message: '返回日期不能早于出发日期',
      path: ['endDate'],
    },
  );

export type TripIntakeForm = z.infer<typeof tripIntakeSchema>;

export function buildTravelFormRequest(form: TripIntakeForm): TravelFormRequest {
  const durationDays =
    form.startDate && form.endDate
      ? daysBetweenInclusive(form.startDate, form.endDate)
      : null;
  const destinations = uniqueStrings(form.destinations);
  return {
    request_mode: form.requestMode,
    origin_city: form.originCity,
    destination: destinations.join('、'),
    destinations,
    return_city: form.returnCity || form.originCity,
    start_date: form.startDate ?? null,
    end_date: form.endDate ?? null,
    duration_days: durationDays,
    traveler_composition: {
      adults: form.adults,
      elders: form.elders,
      children: form.children,
    },
    budget_level: form.budgetLevel,
    travel_mode_preference: form.travelModePreference,
    pace: form.pace,
    route_strictness: form.routeStrictness,
    attraction_preferences: form.attractionPreferences,
    accommodation_preference: form.accommodationPreference,
    food_preference: form.foodPreference,
    preferred_map_provider: form.preferredMapProvider,
    preferred_hotel_platform: form.preferredHotelPlatform,
    notification_preference: form.notificationPreference,
    extra_notes: form.extraNotes || null,
    detail_level: 'deep',
    language: 'zh-CN',
  };
}

function isIsoDate(value: string): boolean {
  if (value.length !== 10 || value[4] !== '-' || value[7] !== '-') {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.toISOString().slice(0, 10) === value;
}

function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const text = value.trim();
    if (!text || seen.has(text)) {
      return;
    }
    seen.add(text);
    result.push(text);
  });
  return result;
}
