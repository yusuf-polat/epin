import { z } from 'zod';
import { WithdrawalStatus } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';
import { isValidTrIban, normalizeIban } from '@/utils/iban';
import { MAX_WITHDRAWAL_AMOUNT, MIN_WITHDRAWAL_AMOUNT } from './withdrawal.constants';

const idParams = z.object({ id: z.string().uuid() });

export const createWithdrawalSchema = z.object({
  body: z.object({
    amount: z
      .number({ invalid_type_error: 'Tutar sayı olmalıdır' })
      .min(MIN_WITHDRAWAL_AMOUNT, `En az ₺${MIN_WITHDRAWAL_AMOUNT} çekilebilir`)
      .max(MAX_WITHDRAWAL_AMOUNT, `Tek seferde en fazla ₺${MAX_WITHDRAWAL_AMOUNT} çekilebilir`)
      .multipleOf(0.01, 'Tutar en fazla 2 ondalık basamak içerebilir'),
    iban: z.string().transform(normalizeIban).refine(isValidTrIban, 'Geçerli bir TR IBAN giriniz'),
    accountHolder: z.string().trim().min(5, 'Hesap sahibinin adı soyadı gereklidir').max(120),
  }),
});

export const listMyWithdrawalsSchema = z.object({ query: z.object(paginationQuery(10)) });

export const adminListWithdrawalsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    status: z.nativeEnum(WithdrawalStatus).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const withdrawalIdSchema = z.object({ params: idParams });

export const markPaidSchema = z.object({
  params: idParams,
  body: z.object({ transferRef: z.string().trim().min(3, 'Transfer referansı giriniz').max(100) }),
});

export const rejectWithdrawalSchema = z.object({
  params: idParams,
  body: z.object({ reason: z.string().trim().min(3, 'Red gerekçesi en az 3 karakter olmalıdır').max(500) }),
});
