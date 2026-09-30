import { WalletTransactionType } from '@prisma/client';

/** Bakiye hareketi; amount her zaman pozitif verilir, yön repository fonksiyonuyla belirlenir */
export interface LedgerEntry {
  userId: string;
  amount: number;
  type: WalletTransactionType;
  description: string;
  orderId?: string | null;
}

export interface WalletSummary {
  walletBalance: number;
  /** Onay bekleyen para çekme taleplerinde bloke edilen tutar */
  pendingWithdrawal: number;
  topupEnabled: boolean;
  /** Havale/EFT ile yükleme (platform banka hesabı tanımlıysa) */
  bankTransferEnabled: boolean;
}

export interface AdminLedgerQuery {
  page: number;
  limit: number;
  userId?: string;
  type?: WalletTransactionType;
  search?: string;
}
