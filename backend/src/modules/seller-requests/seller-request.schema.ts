import { z } from 'zod';

export const createSellerRequestSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(10, 'Açıklama en az 10 karakter olmalıdır').max(1000),
  }),
});

export const listSellerRequestsSchema = z.object({
  query: z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional() }),
});

export const resolveSellerRequestSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    action: z.enum(['APPROVED', 'REJECTED']),
    adminNotes: z.string().trim().max(500).optional(),
  }),
});
