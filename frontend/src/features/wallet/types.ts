export type WalletTransactionType = 'TOPUP' | 'PURCHASE' | 'SALE_RELEASE' | 'REFUND' | 'ADMIN_ADJUSTMENT' | 'WITHDRAWAL' | 'WITHDRAWAL_REFUND';

export interface WalletSummary {
  walletBalance: number;
  /** Onay bekleyen para çekme taleplerinde bloke edilen tutar */
  pendingWithdrawal: number;
  topupEnabled: boolean;
  bankTransferEnabled: boolean;
}

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  description: string;
  createdAt: string;
  order: { id: string; orderNumber: string } | null;
}

/** Yönetim defteri satırı */
export interface LedgerRow extends WalletTransaction {
  user: { id: string; name: string; email: string };
}

export interface BankAccountInfo {
  bankName: string;
  accountHolder: string;
  iban: string;
}

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type WithdrawalStatus = 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELLED';

interface RequestOwner {
  user?: { id: string; name: string; email: string };
}

export type DepositMethod = 'HAVALE_EFT' | 'CRYPTO';

export interface DepositRequest extends RequestOwner {
  id: string;
  method: DepositMethod;
  amount: number;
  approvedAmount: number | null;
  /** Havale/EFT gönderen hesap sahibi (kriptoda boş) */
  senderName: string | null;
  /** Kripto: "VARLIK · AĞ" ve işlem özeti */
  network: string | null;
  txHash: string | null;
  referenceCode: string;
  status: DepositStatus;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface CreatedDeposit extends DepositRequest {
  bankAccount: BankAccountInfo;
}

export interface WithdrawalRequest extends RequestOwner {
  id: string;
  /** Bakiyeden düşülen tutar */
  amount: number;
  /** Talep anında kesilen para çekme ücreti */
  fee: number;
  /** Banka hesabına gönderilecek tutar (amount - fee) */
  netAmount: number;
  iban: string;
  accountHolder: string;
  status: WithdrawalStatus;
  adminNote: string | null;
  transferRef: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface AdminListParams {
  page: number;
  status?: string;
  search?: string;
}
