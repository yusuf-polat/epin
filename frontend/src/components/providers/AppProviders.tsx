'use client';

import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query/query-client';
import { authKeys } from '@/features/auth/constants';
import type { AuthUser } from '@/features/auth/types';
import { useGuestCartMerge } from '@/features/cart/hooks/useCart';

function SessionEffects() {
  useGuestCartMerge();
  return null;
}

/**
 * İstemci tarafı sağlayıcılar. Sunucuda çözülen oturum kullanıcısı QueryClient'a
 * başlangıç verisi olarak yazılır; böylece ilk render'da oturum bilgisi hazırdır.
 */
export function AppProviders({ initialUser, children }: { initialUser: AuthUser | null; children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = makeQueryClient();
    client.setQueryData(authKeys.me, initialUser);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionEffects />
      {children}
    </QueryClientProvider>
  );
}
