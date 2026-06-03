export function createJobEventSource(jobId: string): EventSource {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const encodedJobId = encodeURIComponent(jobId);
  return new EventSource(`${baseUrl}/tourism/jobs/${encodedJobId}/events`);
}
