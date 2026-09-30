import { z } from 'zod';
import { WalletTransactionType } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';
import { MAX_ADMIN_ADJUSTMENT, MAX_TOPUP_AMOUNT, MIN_TOPUP_AMOUNT } from './wallet.constants';

export const topupSchema = z.object({
  body: z.object({
    amount: z
      .number({ invalid_type_error: 'Tutar sayı olmalıdır' })
      .min(MIN_TOPUP_AMOUNT, `Minimum yüklenebilir tutar ₺${MIN_TOPUP_AMOUNT} olmalıdır`)
      .max(MAX_TOPUP_AMOUNT, 'Maksimum tek seferde ₺50.000 yüklenebilir'),
  }),
});

export const listTransactionsSchema = z.object({
  query: z.object(paginationQuery(20)),
});

export const adminLedgerSchema = z.object({
  query: z.object({
    ...paginationQuery(30),
    userId: z.string().uuid().optional(),
    type: z.nativeEnum(WalletTransactionType).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const adminAdjustSchema = z.object({
  params: z.object({ userId: z.string().uuid() }),
  body: z.object({
    amount: z
      .number()
      .refine((v) => v !== 0, 'Tutar 0 olamaz')
      .refine((v) => Math.abs(v) <= MAX_ADMIN_ADJUSTMENT, 'Tutar çok büyük'),
    note: z.string().trim().min(3, 'Açıklama en az 3 karakter olmalıdır').max(300),
  }),
});
