import { z } from 'zod';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';

const money = z.number({ invalid_type_error: 'Tutar sayı olmalıdır' }).multipleOf(0.01, 'Tutar en fazla 2 ondalık basamak içerebilir');

export const checkoutSchema = z.object({
  body: z.object({
    provider: z.nativeEnum(PaymentProvider),
    amount: money.positive('Tutar 0 dan büyük olmalıdır').max(1_000_000),
  }),
});

export const paymentIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const listMyPaymentsSchema = z.object({ query: z.object(paginationQuery(10)) });

export const adminListPaymentsSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    status: z.nativeEnum(PaymentStatus).optional(),
    provider: z.nativeEnum(PaymentProvider).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});

const fieldMap = z.record(z.string().max(60), z.string().max(4000));

export const updateGatewaySchema = z.object({
  params: z.object({ provider: z.nativeEnum(PaymentProvider) }),
  body: z
    .object({
      isEnabled: z.boolean(),
      testMode: z.boolean(),
      displayName: z.string().trim().min(2, 'Görünen ad en az 2 karakter olmalıdır').max(60),
      description: z.string().trim().max(300).nullable(),
      sortOrder: z.number().int().min(0).max(100),
      minAmount: money.min(1, 'En düşük tutar en az ₺1 olmalıdır').max(1_000_000),
      maxAmount: money.min(1).max(1_000_000),
      feePercent: z.number().min(0).max(20, 'Hizmet bedeli en fazla %20 olabilir'),
      feeFixed: money.min(0).max(1000),
      settings: fieldMap,
      // Boş metin: mevcut değer korunur · null: değer silinir
      secrets: z.record(z.string().max(60), z.string().max(4000).nullable()),
    })
    .partial(),
});
