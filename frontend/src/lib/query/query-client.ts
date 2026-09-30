import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/api';

/**
 * Sunucu durumu (server state) için ortak TanStack Query ayarları.
 * 4xx hatalar tekrar denenmez; bunlar kullanıcıya gösterilecek iş hatalarıdır.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
