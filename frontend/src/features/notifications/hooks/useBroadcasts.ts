'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BroadcastAudience, broadcastApi, BroadcastInput } from '../services/broadcast.api';

const broadcastKeys = {
  all: ['broadcasts'] as const,
  history: (page: number) => ['broadcasts', page] as const,
  count: (audience: string, email: string) => ['broadcasts', 'count', audience, email] as const,
};

export const useRecipientCount = (audience: BroadcastAudience, email: string, enabled: boolean) =>
  useQuery({
    queryKey: broadcastKeys.count(audience, email),
    queryFn: () => broadcastApi.recipientCount(audience, audience === 'USER' ? email : undefined),
    enabled,
  });

export const useBroadcastHistory = (page: number) =>
  useQuery({ queryKey: broadcastKeys.history(page), queryFn: () => broadcastApi.history(page), placeholderData: keepPreviousData });

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BroadcastInput) => broadcastApi.send(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: broadcastKeys.all }),
  });
}
