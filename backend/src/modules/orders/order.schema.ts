import { z } from 'zod';
import { DeliveryStatus, EscrowStatus } from '@prisma/client';
import { paginationQuery } from '@/utils/pagination';
import { MAX_ITEM_QUANTITY } from '@/modules/cart/cart.constants';

const orderIdParams = z.object({ id: z.string().uuid('Geçersiz sipariş ID') });

export const checkoutSchema = z.object({
  body: z.object({
    // Gerçek ödeme altyapısı entegre edilene kadar yalnızca cüzdan ile ödeme kabul edilir
    paymentMethod: z.literal('WALLET', {
      errorMap: () => ({ message: 'Şu anda yalnızca cüzdan bakiyesi ile ödeme yapılabilmektedir' }),
    }),
    // Mesafeli satış sözleşmesi ve ön bilgilendirme formu onayı
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Mesafeli satış sözleşmesini onaylamanız gerekir' }) }),
    items: z
      .array(
        z.object({
          variantId: z.string().uuid(),
          quantity: z.number().int().positive().max(MAX_ITEM_QUANTITY, `Tek üründen en fazla ${MAX_ITEM_QUANTITY} adet alınabilir`),
        })
      )
      .min(1)
      .max(50)
      .optional(),
  }),
});

export const orderIdSchema = z.object({ params: orderIdParams });

export const deliverOrderSchema = z.object({
  params: orderIdParams,
  body: z.object({
    deliveryNotes: z.string().trim().min(3, 'Teslimat bilgilerini girmelisiniz').max(5000),
    codes: z.array(z.string().trim().min(1).max(500)).max(1000).optional(),
  }),
});

export const sellerCancelSchema = z.object({
  params: orderIdParams,
  body: z.object({ reason: z.string().trim().min(3, 'İptal gerekçesi en az 3 karakter olmalıdır').max(500) }),
});

export const listOrdersSchema = z.object({
  query: z.object(paginationQuery(10)),
});

export const sellerOrdersSchema = z.object({
  query: z.object({ ...paginationQuery(10), filter: z.enum(['pending', 'all']).default('all') }),
});

export const adminOrdersSchema = z.object({
  query: z.object({
    ...paginationQuery(20),
    search: z.string().trim().max(100).optional(),
    escrowStatus: z.nativeEnum(EscrowStatus).optional(),
    deliveryStatus: z.nativeEnum(DeliveryStatus).optional(),
  }),
});
