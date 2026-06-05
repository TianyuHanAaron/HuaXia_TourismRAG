import { api } from './client';

export type TripEventName =
  | 'trip_updated'
  | 'phase_updated'
  | 'task_updated'
  | 'provider_action_launched'
  | 'document_added'
  | 'reminder_due'
  | 'heartbeat';

export type TripEventSource = {
  addEventListener: (
    eventName: TripEventName,
    listener: (event: { data: string }) => void,
  ) => void;
  close: () => void;
  onerror: ((event: unknown) => void) | null;
};

export function createTripEventSource(tripId: string): TripEventSource | null {
  const EventSourceConstructor = (globalThis as unknown as {
    EventSource?: new (url: string) => TripEventSource;
  }).EventSource;
  if (!EventSourceConstructor) {
    return null;
  }
  const baseUrl = api.defaults.baseURL ?? '';
  const encodedTripId = encodeURIComponent(tripId);
  return new EventSourceConstructor(`${baseUrl}/trips/${encodedTripId}/events`);
}
