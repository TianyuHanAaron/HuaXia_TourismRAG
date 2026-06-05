import { QueryClient } from '@tanstack/react-query';

export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 10 * 60 * 1000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 20 * 1000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
