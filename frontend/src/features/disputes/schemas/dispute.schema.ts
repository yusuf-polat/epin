import { z } from 'zod';
import { requiredText } from '@/lib/validations/common';
import { YOUTUBE_URL_REGEX } from '../constants';

export const openDisputeSchema = z.object({
  reason: z.enum(['INVALID_CODE', 'ALREADY_USED', 'WRONG_PRODUCT', 'OTHER'], { errorMap: () => ({ message: 'Lütfen bir sorun kategorisi seçin' }) }),
  description: requiredText(20, 'Açıklama', 2000),
  videoUrl: z.string().trim().regex(YOUTUBE_URL_REGEX, 'Geçerli bir YouTube linki giriniz (youtube.com/watch?v=... veya youtu.be/...)'),
  agreed: z.literal(true, { errorMap: () => ({ message: 'Video kurallarını onaylamanız gerekiyor' }) }),
});

export const sellerRespondSchema = z
  .object({
    action: z.enum(['REFUND', 'REPLACE', 'REJECT'], { errorMap: () => ({ message: 'Lütfen bir aksiyon seçin' }) }),
    response: requiredText(5, 'Yanıt', 1000),
    replacementCode: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.action !== 'REPLACE' || !!v.replacementCode, { message: 'Değişim için yeni kod zorunludur', path: ['replacementCode'] });

export const resolveDisputeSchema = z.object({ adminNotes: requiredText(5, 'Karar gerekçesi', 2000) });

export type OpenDisputeValues = z.infer<typeof openDisputeSchema>;
export type SellerRespondValues = z.infer<typeof sellerRespondSchema>;
export type ResolveDisputeValues = z.infer<typeof resolveDisputeSchema>;
