'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import { walletKeys } from '@/features/wallet/constants';
import { AdminPaymentParams, paymentApi } from '../services/payment.api';
import { PAYMENT_POLL_LIMIT_MS, PAYMENT_POLL_MS, paymentKeys } from '../constants';
import { OnlineProvider, PaymentProvider, UpdateGatewayInput } from '../types';

export const usePaymentMethods = () => useQuery({ queryKey: paymentKeys.methods(), queryFn: paymentApi.methods, staleTime: 60_000 });

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { provider: OnlineProvider; amount: number }) => paymentApi.checkout(v.provider, v.amount),
    onSettled: () => qc.invalidateQueries({ queryKey: [...paymentKeys.all, 'mine'] }),
  });
}

/** Ödeme sonucu: sonuçlanana kadar (en fazla 10 dk) birkaç saniyede bir yenilenir */
export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => paymentApi.get(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status !== 'PENDING') return false;
      return Date.now() - new Date(data.createdAt).getTime() < PAYMENT_POLL_LIMIT_MS ? PAYMENT_POLL_MS : false;
    },
  });
}

export const useMyPayments = (page: number) =>
  useQuery({ queryKey: paymentKeys.mine(page), queryFn: () => paymentApi.mine(page), placeholderData: keepPreviousData });

/** Ödeme tamamlanınca cüzdan ve oturum (header bakiyesi) yenilenir */
export function useRefreshBalance() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: walletKeys.all }), qc.invalidateQueries({ queryKey: authKeys.me })]);
}

// ─── Yönetim ────────────────────────────────────────────────────────────────────
export const useGateways = () => useQuery({ queryKey: paymentKeys.gateways(), queryFn: paymentApi.gateways });

export function useUpdateGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { provider: PaymentProvider; input: UpdateGatewayInput }) => paymentApi.updateGateway(v.provider, v.input),
    onSuccess: (gateway) => {
      qc.setQueryData(paymentKeys.gateways(), (list: typeof gateway[] | undefined) => list?.map((g) => (g.provider === gateway.provider ? gateway : g)));
      return qc.invalidateQueries({ queryKey: paymentKeys.methods() });
    },
  });
}

export const useAdminPayments = (params: AdminPaymentParams) =>
  useQuery({ queryKey: paymentKeys.admin(params), queryFn: () => paymentApi.adminList(params), placeholderData: keepPreviousData });

export function useSyncPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentApi.sync(id),
    onSettled: () => qc.invalidateQueries({ queryKey: [...paymentKeys.all, 'admin'] }),
  });
}
