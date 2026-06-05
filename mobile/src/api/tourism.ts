import { api } from './client';
import type { TravelFormRequest, TravelJobCreateResponse } from '../types/trip';

export async function submitTravelFormJob(
  request: TravelFormRequest,
): Promise<TravelJobCreateResponse> {
  const response = await api.post<TravelJobCreateResponse>('/tourism/forms/jobs', request);
  return response.data;
}
