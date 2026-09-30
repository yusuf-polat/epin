import type { StatusStyle } from '@/types/common';
import type { AdminListParams, DepositStatus, WalletTransactionType, WithdrawalStatus } from './types';

export const walletKeys = {
  all: ['wallet'] as const,
  summary: () => [...walletKeys.all, 'summary'] as const,
  transactions: (page: number) => [...walletKeys.all, 'transactions', page] as const,
  bankInfo: () => [...walletKeys.all, 'bank-info'] as const,
  deposits: (page: number) => [...walletKeys.all, 'deposits', page] as const,
  withdrawals: (page: number) => [...walletKeys.all, 'withdrawals', page] as const,
};

/** Yönetim listeleri (finans paneli) */
export const financeKeys = {
  all: ['finance'] as const,
  deposits: (params: AdminListParams) => [...financeKeys.all, 'deposits', params] as const,
  withdrawals: (params: AdminListParams) => [...financeKeys.all, 'withdrawals', params] as const,
  ledger: (params: AdminListParams & { type?: string }) => [...financeKeys.all, 'ledger', params] as const,
};

export const TOPUP_PRESETS = [100, 250, 500, 1000];
export const MIN_TOPUP = 10;
export const MAX_TOPUP = 50_000;
export const MIN_DEPOSIT = 20;
export const MAX_DEPOSIT = 50_000;
export const MIN_WITHDRAWAL = 50;
export const MAX_WITHDRAWAL = 100_000;

export const TRANSACTION_LABELS: Record<WalletTransactionType, { label: string; icon: string }> = {
  TOPUP: { label: 'Bakiye Yükleme', icon: 'add_card' },
  PURCHASE: { label: 'Satın Alma', icon: 'shopping_bag' },
  SALE_RELEASE: { label: 'Satış Geliri', icon: 'payments' },
  REFUND: { label: 'İade', icon: 'undo' },
  ADMIN_ADJUSTMENT: { label: 'Yönetici Düzenlemesi', icon: 'tune' },
  WITHDRAWAL: { label: 'Para Çekme', icon: 'account_balance' },
  WITHDRAWAL_REFUND: { label: 'Para Çekme İadesi', icon: 'undo' },
};

const PENDING_STYLE = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
const OK_STYLE = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
const BAD_STYLE = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
const MUTED_STYLE = 'bg-slate-500/10 text-slate-300 border-slate-500/30';

export const DEPOSIT_STATUS: Record<DepositStatus, StatusStyle> = {
  PENDING: { label: 'Onay Bekliyor', className: PENDING_STYLE },
  APPROVED: { label: 'Yüklendi', className: OK_STYLE },
  REJECTED: { label: 'Reddedildi', className: BAD_STYLE },
  CANCELLED: { label: 'İptal Edildi', className: MUTED_STYLE },
};

export const WITHDRAWAL_STATUS: Record<WithdrawalStatus, StatusStyle> = {
  PENDING: { label: 'İnceleniyor', className: PENDING_STYLE },
  PAID: { label: 'Ödendi', className: OK_STYLE },
  REJECTED: { label: 'Reddedildi · İade', className: BAD_STYLE },
  CANCELLED: { label: 'İptal · İade', className: MUTED_STYLE },
};
