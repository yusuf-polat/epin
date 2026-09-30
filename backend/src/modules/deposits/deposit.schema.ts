import { z } from 'zod';
import { DepositStatus } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';
import { MAX_DEPOSIT_AMOUNT, MIN_DEPOSIT_AMOUNT } from './deposit.constants';

const idParams = z.object({ id: z.string().uuid() });
const amount = z
  .number({ invalid_type_error: 'Tutar sayı olmalıdır' })
  .min(MIN_DEPOSIT_AMOUNT, `En az ₺${MIN_DEPOSIT_AMOUNT} yüklenebilir`)
  .max(MAX_DEPOSIT_AMOUNT, `Tek seferde en fazla ₺${MAX_DEPOSIT_AMOUNT} yüklenebilir`)
  .multipleOf(0.01, 'Tutar en fazla 2 ondalık basamak içerebilir');

export const createDepositSchema = z.object({
  body: z.object({
    amount,
    senderName: z.string().trim().min(5, 'Gönderen hesap sahibinin adı soyadı gereklidir').max(120),
  }),
});

export const createCryptoDepositSchema = z.object({
  body: z.object({
    amount,
    network: z.string().trim().min(2).max(80),
    txHash: z
      .string()
      .trim()
      .min(10, 'Geçerli bir işlem özeti (TX hash) giriniz')
      .max(150)
      .regex(/^[A-Za-z0-9:_-]+$/, 'İşlem özeti yalnızca harf ve rakam içerebilir'),
  }),
});

export const listMyDepositsSchema = z.object({ query: z.object(paginationQuery(10)) });

export const adminListDepositsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    status: z.nativeEnum(DepositStatus).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

export const depositIdSchema = z.object({ params: idParams });

export const approveDepositSchema = z.object({
  params: idParams,
  // Bankaya ulaşan tutar talep edilenden farklıysa gerçek tutar girilir
  body: z.object({ approvedAmount: amount.optional() }),
});

export const rejectDepositSchema = z.object({
  params: idParams,
  body: z.object({ reason: z.string().trim().min(3, 'Red gerekçesi en az 3 karakter olmalıdır').max(500) }),
});
