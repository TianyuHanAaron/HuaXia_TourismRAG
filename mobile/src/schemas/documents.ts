import { z } from 'zod';
import type {
  TripBookingCreateRequest,
  TripDocumentCreateRequest,
} from '../types/trip';

export const documentCategorySchema = z.enum([
  'flight_train',
  'hotel',
  'ticket',
  'id_passport',
  'insurance',
  'visa',
  'custom',
]);

export const bookingCategorySchema = z.enum([
  'flight',
  'train',
  'hotel',
  'ticket',
  'transport',
  'custom',
]);

const trimmedOptionalSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const trimmedNullableSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => (value ? value : null));

const taskIdsSchema = z.array(z.string().trim().min(1)).default([]);

export const documentMetadataSchema = z.object({
  category: documentCategorySchema.default('custom'),
  title: z.string().trim().min(1, '请填写文件标题').max(120),
  file_name: trimmedNullableSchema,
  content_type: trimmedNullableSchema,
  storage_ref: trimmedNullableSchema,
  local_reference: trimmedNullableSchema,
  task_ids: taskIdsSchema,
  sensitive: z.boolean().default(true),
});

export const bookingMetadataSchema = z.object({
  category: bookingCategorySchema.default('custom'),
  title: z.string().trim().min(1, '请填写预订标题').max(120),
  confirmation_code: trimmedNullableSchema,
  provider: trimmedNullableSchema,
  starts_at: trimmedNullableSchema,
  ends_at: trimmedNullableSchema,
  notes: trimmedOptionalSchema,
  task_ids: taskIdsSchema,
});

export type DocumentMetadataForm = z.infer<typeof documentMetadataSchema>;
export type BookingMetadataForm = z.infer<typeof bookingMetadataSchema>;

export function parseDocumentMetadata(input: unknown): TripDocumentCreateRequest {
  return documentMetadataSchema.parse(input) as TripDocumentCreateRequest;
}

export function parseBookingMetadata(input: unknown): TripBookingCreateRequest {
  return bookingMetadataSchema.parse(input) as TripBookingCreateRequest;
}
