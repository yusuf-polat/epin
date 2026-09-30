import { WithdrawalStatus } from '@prisma/client';

export interface CreateWithdrawalDTO {
  amount: number;
  iban: string;
  accountHolder: string;
}

export interface AdminWithdrawalListQuery {
  page: number;
  limit: number;
  status?: WithdrawalStatus;
  search?: string;
}
