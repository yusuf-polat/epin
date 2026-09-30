import { DepositStatus } from '@prisma/client';

export interface CreateDepositDTO {
  amount: number;
  senderName: string;
}

export interface CreateCryptoDepositDTO {
  amount: number;
  /** "VARLIK · AĞ" (ör. USDT · TRC20) */
  network: string;
  txHash: string;
}

export interface AdminDepositListQuery {
  page: number;
  limit: number;
  status?: DepositStatus;
  search?: string;
}

export interface BankAccountInfo {
  bankName: string;
  accountHolder: string;
  iban: string;
}
