import { apiClient } from '@/lib/api';
import {
  AdminListParams,
  BankAccountInfo,
  CreatedDeposit,
  DepositRequest,
  LedgerRow,
  WalletSummary,
  WalletTransaction,
  WithdrawalRequest,
} from '../types';

export const walletApi = {
  summary: () => apiClient.get<WalletSummary>('/wallet'),
  transactions: (page = 1, limit = 20) => apiClient.getPage<WalletTransaction>('/wallet/transactions', { params: { page, limit } }),
  topup: (amount: number) => apiClient.post<WalletSummary>('/wallet/topup', { amount }),
  adminAdjust: (userId: string, amount: number, note: string) => apiClient.post<WalletSummary>(`/wallet/admin/${userId}/adjust`, { amount, note }),
  adminLedger: (params: AdminListParams & { type?: string }) => apiClient.getPage<LedgerRow>('/wallet/admin/transactions', { params: { ...params } }),
};

/** Havale/EFT ile bakiye yükleme talepleri */
export const depositApi = {
  bankInfo: () => apiClient.get<BankAccountInfo>('/deposits/bank-info'),
  create: (input: { amount: number; senderName: string }) => apiClient.post<CreatedDeposit>('/deposits', input),
  createCrypto: (input: { amount: number; network: string; txHash: string }) => apiClient.post<DepositRequest>('/deposits/crypto', input),
  mine: (page: number) => apiClient.getPage<DepositRequest>('/deposits/mine', { params: { page } }),
  cancel: (id: string) => apiClient.post(`/deposits/${id}/cancel`),
  adminList: (params: AdminListParams) => apiClient.getPage<DepositRequest>('/deposits', { params: { ...params } }),
  approve: (id: string, approvedAmount?: number) => apiClient.post(`/deposits/${id}/approve`, { approvedAmount }),
  reject: (id: string, reason: string) => apiClient.post(`/deposits/${id}/reject`, { reason }),
};

/** Satıcı para çekme talepleri */
export const withdrawalApi = {
  create: (input: { amount: number; iban: string; accountHolder: string }) => apiClient.post<WithdrawalRequest>('/withdrawals', input),
  mine: (page: number) => apiClient.getPage<WithdrawalRequest>('/withdrawals/mine', { params: { page } }),
  cancel: (id: string) => apiClient.post(`/withdrawals/${id}/cancel`),
  adminList: (params: AdminListParams) => apiClient.getPage<WithdrawalRequest>('/withdrawals', { params: { ...params } }),
  markPaid: (id: string, transferRef: string) => apiClient.post(`/withdrawals/${id}/paid`, { transferRef }),
  reject: (id: string, reason: string) => apiClient.post(`/withdrawals/${id}/reject`, { reason }),
};
