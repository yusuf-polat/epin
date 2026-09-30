'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/constants';
import { depositApi, walletApi, withdrawalApi } from '../services/wallet.api';
import { financeKeys, walletKeys } from '../constants';
import { AdminListParams } from '../types';

export const useWalletSummary = () => useQuery({ queryKey: walletKeys.summary(), queryFn: walletApi.summary });

export const useWalletTransactions = (page: number) =>
  useQuery({ queryKey: walletKeys.transactions(page), queryFn: () => walletApi.transactions(page), placeholderData: keepPreviousData });

/** Bakiyeyi etkileyen işlemler cüzdan, oturum (header bakiyesi) ve finans listelerini yeniler */
function useBalanceMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: walletKeys.all }),
        qc.invalidateQueries({ queryKey: financeKeys.all }),
        qc.invalidateQueries({ queryKey: authKeys.me }),
      ]),
  });
}

export const useTopup = () => useBalanceMutation((amount: number) => walletApi.topup(amount));

/** Yönetici bakiye düzenlemesi (kullanıcı listesi de yenilenir) */
export function useAdminAdjustBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: string; amount: number; note: string }) => walletApi.adminAdjust(v.userId, v.amount, v.note),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: ['users', 'admin'] }), qc.invalidateQueries({ queryKey: financeKeys.all })]),
  });
}

// ─── Havale/EFT ile yükleme ────────────────────────────────────────────────────
export const useBankInfo = (enabled: boolean) =>
  useQuery({ queryKey: walletKeys.bankInfo(), queryFn: depositApi.bankInfo, enabled, staleTime: 60 * 60_000 });

export const useMyDeposits = (page: number) =>
  useQuery({ queryKey: walletKeys.deposits(page), queryFn: () => depositApi.mine(page), placeholderData: keepPreviousData });

export const useCreateDeposit = () => useBalanceMutation((input: { amount: number; senderName: string }) => depositApi.create(input));
export const useCreateCryptoDeposit = () =>
  useBalanceMutation((input: { amount: number; network: string; txHash: string }) => depositApi.createCrypto(input));
export const useCancelDeposit = () => useBalanceMutation((id: string) => depositApi.cancel(id));

// ─── Para çekme ────────────────────────────────────────────────────────────────
export const useMyWithdrawals = (page: number, enabled = true) =>
  useQuery({ queryKey: walletKeys.withdrawals(page), queryFn: () => withdrawalApi.mine(page), placeholderData: keepPreviousData, enabled });

export const useCreateWithdrawal = () =>
  useBalanceMutation((input: { amount: number; iban: string; accountHolder: string }) => withdrawalApi.create(input));
export const useCancelWithdrawal = () => useBalanceMutation((id: string) => withdrawalApi.cancel(id));

// ─── Finans yönetimi ───────────────────────────────────────────────────────────
export const useAdminDeposits = (params: AdminListParams) =>
  useQuery({ queryKey: financeKeys.deposits(params), queryFn: () => depositApi.adminList(params), placeholderData: keepPreviousData });

export const useAdminWithdrawals = (params: AdminListParams) =>
  useQuery({ queryKey: financeKeys.withdrawals(params), queryFn: () => withdrawalApi.adminList(params), placeholderData: keepPreviousData });

export const useAdminLedger = (params: AdminListParams & { type?: string }) =>
  useQuery({ queryKey: financeKeys.ledger(params), queryFn: () => walletApi.adminLedger(params), placeholderData: keepPreviousData });

export const useApproveDeposit = () => useBalanceMutation((v: { id: string; approvedAmount?: number }) => depositApi.approve(v.id, v.approvedAmount));
export const useRejectDeposit = () => useBalanceMutation((v: { id: string; reason: string }) => depositApi.reject(v.id, v.reason));
export const useMarkWithdrawalPaid = () => useBalanceMutation((v: { id: string; transferRef: string }) => withdrawalApi.markPaid(v.id, v.transferRef));
export const useRejectWithdrawal = () => useBalanceMutation((v: { id: string; reason: string }) => withdrawalApi.reject(v.id, v.reason));
