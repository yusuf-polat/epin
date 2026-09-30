'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import { sellerRequestApi } from '../services/seller-request.api';
import { sellerRequestKeys } from '../constants';

export const useMySellerRequests = () => useQuery({ queryKey: sellerRequestKeys.mine(), queryFn: sellerRequestApi.listMine });

export const useSellerRequestsAdmin = () => useQuery({ queryKey: sellerRequestKeys.admin(), queryFn: () => sellerRequestApi.list() });

export function useCreateSellerRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: sellerRequestApi.create, onSettled: () => qc.invalidateQueries({ queryKey: sellerRequestKeys.all }) });
}

export function useResolveSellerRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; action: 'APPROVED' | 'REJECTED'; adminNotes?: string }) => sellerRequestApi.resolve(v.id, v.action, v.adminNotes),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: sellerRequestKeys.all }), qc.invalidateQueries({ queryKey: ['users', 'admin'] }), qc.invalidateQueries({ queryKey: authKeys.me })]),
  });
}
