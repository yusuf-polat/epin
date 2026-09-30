import { z } from 'zod';
import { requiredText, splitLines } from '@/lib/validations/common';

export const deliverOrderSchema = (maxCodes: number) =>
  z
    .object({
      deliveryNotes: requiredText(3, 'Teslimat bilgisi', 5000),
      codesText: z.string().default(''),
    })
    .refine((v) => splitLines(v.codesText).length <= maxCodes, {
      message: `Bu sipariş için en fazla ${maxCodes} kod girebilirsiniz`,
      path: ['codesText'],
    });

export const sellerCancelSchema = z.object({ reason: requiredText(3, 'İptal gerekçesi', 500) });

export const escalateSchema = z.object({ description: requiredText(10, 'Açıklama', 2000) });

export type DeliverOrderValues = z.infer<ReturnType<typeof deliverOrderSchema>>;
export type SellerCancelValues = z.infer<typeof sellerCancelSchema>;
export type EscalateValues = z.infer<typeof escalateSchema>;
