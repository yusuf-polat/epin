'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/api';
import { authApi } from '../services/auth.api';
import { authKeys } from '../constants';
import { AuthUser } from '../types';

/** Oturum yoksa (401) null döner; diğer hatalar yukarı iletilir */
async function fetchSession(): Promise<AuthUser | null> {
  try {
    return await authApi.me();
  } catch (err) {
    if (isApiError(err) && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
}

/**
 * Oturumdaki kullanıcı. İlk değer sunucuda HttpOnly cookie ile çözülüp
 * QueryClient'a yerleştirilir (AppProviders); istemcide token saklanmaz.
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery({ queryKey: authKeys.me, queryFn: fetchSession, staleTime: 60_000 });

  /** Bakiye, rol gibi alanlar değiştiğinde oturum bilgisini yeniler */
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: authKeys.me }), [queryClient]);

  return { user: data ?? null, isFetching, refresh };
}
