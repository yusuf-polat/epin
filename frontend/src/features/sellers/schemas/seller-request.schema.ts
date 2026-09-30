import { z } from 'zod';
import { requiredText } from '@/lib/validations/common';

export const sellerRequestSchema = z.object({ reason: requiredText(10, 'Açıklama', 1000) });
export const resolveSellerRequestSchema = z.object({ adminNotes: z.string().trim().max(500).optional() });

export type SellerRequestValues = z.infer<typeof sellerRequestSchema>;
export type ResolveSellerRequestValues = z.infer<typeof resolveSellerRequestSchema>;
