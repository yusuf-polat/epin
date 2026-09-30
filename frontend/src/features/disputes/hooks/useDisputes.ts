'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import { orderKeys } from '@/features/orders/constants';
import { pinKeys } from '@/features/pins/constants';
import { walletKeys } from '@/features/wallet/constants';
import { disputeApi } from '../services/dispute.api';
import { disputeKeys } from '../constants';
import { DisputeStatus } from '../types';

export const useSellerDisputes = () => useQuery({ queryKey: disputeKeys.seller(), queryFn: disputeApi.listForSeller });

export const useAdminDisputes = (status?: DisputeStatus) =>
  useQuery({ queryKey: disputeKeys.admin(status), queryFn: () => disputeApi.listAll(status) });

/** İtiraz işlemleri escrow'u etkilediği için sipariş, cüzdan ve kod verileri de yenilenir */
function useDisputeMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([disputeKeys.all, orderKeys.all, walletKeys.all, pinKeys.all, authKeys.me].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export const useOpenDispute = () => useDisputeMutation(disputeApi.create);
export const useCancelDispute = () => useDisputeMutation((id: string) => disputeApi.cancel(id));
export const useEscalateDispute = () => useDisputeMutation((v: { id: string; description: string }) => disputeApi.escalate(v.id, v.description));
export const useSellerRespond = () =>
  useDisputeMutation((v: { id: string } & Parameters<typeof disputeApi.sellerRespond>[1]) => {
    const { id, ...input } = v;
    return disputeApi.sellerRespond(id, input);
  });
export const useResolveDispute = () =>
  useDisputeMutation((v: { id: string; decision: 'BUYER' | 'SELLER'; adminNotes: string }) =>
    disputeApi.resolve(v.id, { decision: v.decision, adminNotes: v.adminNotes })
  );
