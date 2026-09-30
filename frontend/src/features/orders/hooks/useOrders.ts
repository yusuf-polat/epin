'use client';

import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import { cartKeys } from '@/features/cart/constants';
import { pinKeys } from '@/features/pins/constants';
import { walletKeys } from '@/features/wallet/constants';
import { orderApi } from '../services/order.api';
import { orderKeys } from '../constants';
import { AdminOrderParams } from '../types';

/** Para hareketi yaratan sipariş işlemlerinden sonra etkilenen tüm veriler yenilenir */
const invalidateOrderRelated = (qc: QueryClient) =>
  Promise.all(
    [orderKeys.all, authKeys.me, walletKeys.all, pinKeys.all].map((queryKey) => qc.invalidateQueries({ queryKey }))
  );

export const useMyOrders = (page: number) =>
  useQuery({ queryKey: orderKeys.mineList(page), queryFn: () => orderApi.listMine(page), placeholderData: keepPreviousData });

export const useOrder = (id: string) => useQuery({ queryKey: orderKeys.detail(id), queryFn: () => orderApi.get(id) });

export const useSellerSales = (filter: 'pending' | 'all', page: number) =>
  useQuery({ queryKey: orderKeys.sales(filter, page), queryFn: () => orderApi.listSales(filter, page), placeholderData: keepPreviousData });

export const useAdminOrders = (params: AdminOrderParams) =>
  useQuery({ queryKey: orderKeys.admin(params), queryFn: () => orderApi.adminList(params), placeholderData: keepPreviousData });

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderApi.checkout,
    onSettled: () => Promise.all([invalidateOrderRelated(qc), qc.invalidateQueries({ queryKey: cartKeys.all })]),
  });
}

function useOrderMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => invalidateOrderRelated(qc) });
}

export const useConfirmOrder = () => useOrderMutation((id: string) => orderApi.confirm(id));
export const useCancelOverdueOrder = () => useOrderMutation((id: string) => orderApi.cancelOverdue(id));
export const useDeliverOrder = () =>
  useOrderMutation((v: { id: string; deliveryNotes: string; codes?: string[] }) => orderApi.deliver(v.id, { deliveryNotes: v.deliveryNotes, codes: v.codes }));
export const useSellerCancelOrder = () => useOrderMutation((v: { id: string; reason: string }) => orderApi.sellerCancel(v.id, v.reason));
