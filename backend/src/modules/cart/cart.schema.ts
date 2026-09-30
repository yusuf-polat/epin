import { z } from 'zod';
import { MAX_ITEM_QUANTITY, MAX_MERGE_LINES } from './cart.constants';

const quantity = z
  .number()
  .int()
  .min(1, 'Adet en az 1 olmalıdır')
  .max(MAX_ITEM_QUANTITY, `Tek üründen en fazla ${MAX_ITEM_QUANTITY} adet alınabilir`);

export const addToCartSchema = z.object({
  body: z.object({
    variantId: z.string().uuid('Geçersiz varyant ID'),
    quantity: quantity.default(1),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({ itemId: z.string().uuid() }),
  body: z.object({ quantity: z.number().int().min(0).max(MAX_ITEM_QUANTITY) }),
});

export const cartItemIdSchema = z.object({
  params: z.object({ itemId: z.string().uuid() }),
});

export const mergeCartSchema = z.object({
  body: z.object({
    items: z.array(z.object({ variantId: z.string().uuid(), quantity })).max(MAX_MERGE_LINES),
  }),
});
