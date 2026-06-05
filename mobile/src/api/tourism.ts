import { apiPost } from './client';
import { TravelJobCreateResponseSchema } from './schemas';
import type { TravelFormRequest, TravelJobCreateResponse } from '../types/trip';

export async function submitTravelFormJob(
  request: TravelFormRequest,
): Promise<TravelJobCreateResponse> {
  return apiPost('/tourism/forms/jobs', request, TravelJobCreateResponseSchema);
}
