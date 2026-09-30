import { z } from 'zod';

const youtubeUrlRegex = /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;
const idParams = z.object({ id: z.string().uuid() });

export const createDisputeSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('Geçersiz sipariş ID'),
    reason: z.enum(['INVALID_CODE', 'ALREADY_USED', 'WRONG_PRODUCT', 'OTHER']),
    description: z.string().trim().min(20, 'Açıklama en az 20 karakter olmalıdır').max(2000),
    videoUrl: z.string().trim().regex(youtubeUrlRegex, 'Geçerli bir YouTube linki giriniz (youtube.com/watch?v=... veya youtu.be/...)'),
  }),
});

export const sellerRespondSchema = z.object({
  params: idParams,
  body: z
    .object({
      action: z.enum(['REFUND', 'REPLACE', 'REJECT']),
      response: z.string().trim().min(5, 'Yanıt en az 5 karakter olmalıdır').max(1000),
      replacementCode: z.string().trim().max(500).optional(),
    })
    .refine((b) => b.action !== 'REPLACE' || !!b.replacementCode, {
      message: 'Değişim için yeni kod zorunludur',
      path: ['replacementCode'],
    }),
});

export const resolveDisputeSchema = z.object({
  params: idParams,
  body: z.object({
    decision: z.enum(['BUYER', 'SELLER']),
    adminNotes: z.string().trim().min(5, 'Not en az 5 karakter olmalıdır').max(2000),
  }),
});

export const escalateDisputeSchema = z.object({
  params: idParams,
  body: z.object({ description: z.string().trim().min(10, 'Açıklama en az 10 karakter olmalıdır').max(2000) }),
});

export const disputeIdSchema = z.object({ params: idParams });

export const listDisputesSchema = z.object({
  query: z.object({
    status: z.enum(['WAITING_SELLER', 'SELLER_APPROVED', 'WAITING_SUPPORT', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CANCELLED']).optional(),
  }),
});
