'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import { storeApi } from '../services/store.api';
import { storeKeys } from '../constants';
import { StoreInput } from '../types';

export const useMyStore = () => useQuery({ queryKey: storeKeys.mine(), queryFn: storeApi.mine });

export const useAdminStores = (params: { page: number; search?: string }) =>
  useQuery({ queryKey: storeKeys.admin(params), queryFn: () => storeApi.adminList({ ...params, limit: 20 }), placeholderData: keepPreviousData });

/** Mağaza oluşturma/güncelleme; oturumdaki kullanıcının mağaza bilgisi de yenilenir */
function useStoreMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: storeKeys.all }), qc.invalidateQueries({ queryKey: authKeys.me })]),
  });
}

export const useCreateStore = () => useStoreMutation((input: StoreInput) => storeApi.create(input));
export const useUpdateStore = () => useStoreMutation((input: Pick<StoreInput, 'description' | 'logoUrl' | 'coverUrl'>) => storeApi.update(input));
export const useToggleStore = () => useStoreMutation((id: string) => storeApi.toggleActive(id));
