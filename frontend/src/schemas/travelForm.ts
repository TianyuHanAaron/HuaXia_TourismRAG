import { z } from 'zod';

export const travelFormSchema = z
  .object({
    request_mode: z.enum(['normal', 'diy']).default('normal'),
    origin_city: z.string().trim().max(80).optional(),
    destination: z.string().trim().min(1).max(120),
    return_city: z.string().trim().max(80).optional(),
    required_stops: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    duration_days: z.coerce.number().int().min(1).max(60).optional(),
    traveler_group: z
      .enum(['solo', 'couple', 'family', 'friends', 'parents', 'business'])
      .optional(),
    traveler_composition: z.object({
      adults: z.coerce.number().int().min(0).max(20).default(1),
      elders: z.coerce.number().int().min(0).max(10).default(0),
      children: z.coerce.number().int().min(0).max(10).default(0),
    }),
    budget_level: z.enum(['budget', 'mid_range', 'luxury']).optional(),
    travel_mode_preference: z
      .enum(['train_first', 'flight_first', 'self_drive', 'charter_when_needed', 'mixed'])
      .default('mixed'),
    pace: z.enum(['relaxed', 'balanced', 'intensive']).default('balanced'),
    route_strictness: z
      .enum(['flexible', 'must_cover_all', 'theme_pure', 'balanced_city'])
      .default('flexible'),
    attraction_preferences: z
      .array(
        z.enum([
          'history_culture',
          'nature',
          'food',
          'family_friendly',
          'photography',
          'theme_route',
          'heritage',
          'city_classics',
        ]),
      )
      .max(8)
      .default([]),
    accommodation_preference: z
      .enum(['convenient', 'luxury', 'boutique', 'budget'])
      .default('convenient'),
    food_preference: z
      .enum(['local_snacks', 'classic_restaurants', 'fine_dining', 'balanced'])
      .default('balanced'),
    must_have: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    avoid: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    extra_notes: z.string().trim().max(500).optional(),
    detail_level: z.enum(['concise', 'standard', 'deep']).default('deep'),
    language: z.enum(['zh-CN', 'en']).default('zh-CN'),
  })
  .refine((value) => value.traveler_composition.adults + value.traveler_composition.elders + value.traveler_composition.children > 0, {
    message: 'At least one traveler is required.',
    path: ['traveler_composition'],
  })
  .refine(
    (value) =>
      !value.start_date ||
      !value.end_date ||
      new Date(value.end_date).getTime() >= new Date(value.start_date).getTime(),
    {
      message: 'End date must be on or after start date.',
      path: ['end_date'],
    },
  );

export type TravelFormDraft = z.infer<typeof travelFormSchema>;

export const splitListText = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
